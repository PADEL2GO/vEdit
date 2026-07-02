-- =============================================================================
-- CHECKOUT CLAIM (July 2026)
-- Closes the concurrent free-money / discount-farming race on the booking points
-- path by making checkout MUTUALLY EXCLUSIVE per booking. Only ONE checkout attempt
-- may ever hold a points reserve on a given booking; a losing concurrent attempt is
-- rejected BEFORE it reserves anything, so it has no reserve to refund and cannot
-- clobber the winner's reserve.
--
-- Root cause: reserved_credits / reserved_reward were last-writer-wins with no
-- per-request ownership. Two concurrent requests for the same booking could both
-- reserve: the second request's start-of-request release_booking_reserves refunded
-- the first request's just-persisted reserve into the wallet, the second re-reserved,
-- and settle_booking_reserves finalized whatever reserved_* was on the row while the
-- loser refunded a reserve already finalized as credits_used -- net: booking confirmed
-- but points returned to wallet (free court, repeatable).
--
-- Fix: a per-booking checkout_claim token. claim_checkout atomically (row-locked)
-- sets our token or rejects. settle_booking_reserves clears the claim on confirm and
-- the create-checkout compensation path clears it on an in-request abort. release does
-- NOT touch the claim: create-checkout calls release right after the winner claims
-- (start-of-request idempotency refund of a PRIOR abandoned reserve), so clearing it
-- there would drop the winner's OWN fresh claim and let a concurrent request re-claim
-- and reserve too -- reopening the very free-court race this migration closes.
-- Each function body uses a uniquely-named dollar-quote tag so the Supabase SQL
-- editor never mis-pairs delimiters across the bodies.
-- =============================================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_claim uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_claimed_at timestamptz;

-- claim_checkout: atomically claim a booking's checkout slot. The whole check+set
-- runs under one FOR UPDATE txn, so two concurrent claims serialize: the second sees
-- the first token already set (and fresh) and is rejected. A claim is granted when
-- the booking is unclaimed, re-claimed by the same token, has no claimed-at stamp, or
-- the existing claim is stale (older than 2 minutes -- reclaimable after a crash).
CREATE OR REPLACE FUNCTION public.claim_checkout(p_booking_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $claim_checkout$
DECLARE
  rec record;
BEGIN
  SELECT status, checkout_claim, checkout_claimed_at
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF rec.status != 'pending_payment' THEN
    RETURN false;
  END IF;

  IF rec.checkout_claim IS NULL
     OR rec.checkout_claim = p_token
     OR rec.checkout_claimed_at IS NULL
     OR (now() - interval '2 minutes') > rec.checkout_claimed_at THEN
    UPDATE public.bookings
    SET checkout_claim      = p_token,
        checkout_claimed_at = now()
    WHERE id = p_booking_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$claim_checkout$;

REVOKE ALL ON FUNCTION public.claim_checkout(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout(uuid, uuid) TO service_role;

-- release_booking_reserves: verbatim from 20260702010000_reserve_reward_settle.sql
-- (refund reserved play AND reward credits, release soft-reserved voucher use, zero
-- reserves, row-locked + idempotent + pending-only). It deliberately does NOT clear the
-- checkout claim: create-checkout calls it right after claim_checkout to refund a PRIOR
-- abandoned reserve, so clearing the claim here would drop the winner's own fresh claim.
-- The claim is cleared only by settle (on confirm) and by the in-request compensation.
CREATE OR REPLACE FUNCTION public.release_booking_reserves(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $release_claim$
DECLARE
  rec record;
BEGIN
  SELECT user_id, status, reserved_credits, reserved_reward, reserved_voucher_id
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Never refund reserves on a confirmed booking: those credits were SETTLED
  -- (recorded as credits_used), not held -- refunding them would leak credits.
  IF rec.status = 'confirmed' THEN
    RETURN;
  END IF;

  -- Nothing reserved (or already released) -> idempotent no-op.
  IF COALESCE(rec.reserved_credits, 0) = 0
     AND COALESCE(rec.reserved_reward, 0) = 0
     AND rec.reserved_voucher_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.bookings
  SET reserved_credits    = 0,
      reserved_reward     = 0,
      reserved_voucher_id = NULL
  WHERE id = p_booking_id;

  IF rec.user_id IS NOT NULL
     AND (COALESCE(rec.reserved_credits, 0) > 0 OR COALESCE(rec.reserved_reward, 0) > 0) THEN
    UPDATE public.wallets
    SET play_credits   = play_credits + COALESCE(rec.reserved_credits, 0),
        reward_credits = reward_credits + COALESCE(rec.reserved_reward, 0),
        updated_at     = now()
    WHERE user_id = rec.user_id;
  END IF;

  IF rec.reserved_voucher_id IS NOT NULL THEN
    UPDATE public.voucher_codes
    SET current_uses = GREATEST(0, current_uses - 1),
        updated_at   = now()
    WHERE id = rec.reserved_voucher_id;
  END IF;
END;
$release_claim$;

REVOKE ALL ON FUNCTION public.release_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_reserves(uuid) TO service_role;

-- settle_booking_reserves: verbatim from 20260702010000_reserve_reward_settle.sql
-- (confirm a paid booking and finalize credits_used from the LOCKED reserved_credits +
-- reserved_reward, only if still pending_payment; returns false for a duplicate),
-- additionally clearing the checkout claim in the same UPDATE when it confirms.
CREATE OR REPLACE FUNCTION public.settle_booking_reserves(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $settle_claim$
DECLARE
  rec record;
BEGIN
  SELECT status, reserved_credits, reserved_reward
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF rec.status = 'pending_payment' THEN
    UPDATE public.bookings
    SET status              = 'confirmed',
        credits_used        = CASE WHEN COALESCE(reserved_credits, 0) + COALESCE(reserved_reward, 0) > 0
                                   THEN COALESCE(reserved_credits, 0) + COALESCE(reserved_reward, 0)
                                   ELSE credits_used END,
        reserved_credits    = 0,
        reserved_reward     = 0,
        reserved_voucher_id = NULL,
        checkout_claim      = NULL,
        checkout_claimed_at = NULL
    WHERE id = p_booking_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$settle_claim$;

REVOKE ALL ON FUNCTION public.settle_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_booking_reserves(uuid) TO service_role;
