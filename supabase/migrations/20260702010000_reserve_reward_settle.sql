-- =============================================================================
-- RESERVED_REWARD SETTLE / RELEASE (July 2026)
-- Follow-up to 20260701120000 (wallet/credit integrity) and 20260702000000
-- (P2G points economy). Those settle/release RPCs were reserved_reward-blind:
-- settle finalized credits_used from reserved_credits only and release refunded
-- reserved_credits to play_credits only. A booking that spent reward_credits at
-- checkout (reserved_reward > 0) therefore had those points stranded -- never
-- finalized on confirm, never refunded on expiry/cancel.
-- This migration re-creates BOTH functions with the SAME signatures (so existing
-- GRANTs and callers stay valid) so they also finalize/refund reserved_reward.
-- Everything else (idempotent, row-locked, pending-only guards) is unchanged.
-- Each function body uses a uniquely-named dollar-quote tag so the Supabase SQL
-- editor never mis-pairs delimiters across the two bodies.
-- =============================================================================

-- release_booking_reserves: atomically refund a booking's reserved play AND
-- reward credits and release its soft-reserved voucher use, then zero the reserve
-- columns. Idempotent + race-free: the row is locked FOR UPDATE, so whichever
-- caller runs first wins; every later caller sees zeroed reserves and no-ops.
CREATE OR REPLACE FUNCTION public.release_booking_reserves(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $release_reward$
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
$release_reward$;

REVOKE ALL ON FUNCTION public.release_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_reserves(uuid) TO service_role;

-- settle_booking_reserves: atomically confirm a paid booking and finalize
-- credits_used from the LOCKED reserved_credits + reserved_reward, only if still
-- pending_payment. Returns false for a duplicate (already-confirmed) webhook or a
-- booking a sibling expired session already cancelled -- caller must then NOT award.
CREATE OR REPLACE FUNCTION public.settle_booking_reserves(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $settle_reward$
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
        reserved_voucher_id = NULL
    WHERE id = p_booking_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$settle_reward$;

REVOKE ALL ON FUNCTION public.settle_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_booking_reserves(uuid) TO service_role;
