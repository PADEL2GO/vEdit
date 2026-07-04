-- =============================================================================
-- USER-FACING BOOKING CANCELLATION (July 2026)
-- Replaces the unsafe client-side status flip in MyBookings with a single atomic,
-- service-role-only RPC. A user may always cancel a still-in-the-future confirmed
-- booking for a FULL refund (no deadline). The row is locked FOR UPDATE so exactly
-- one caller can ever flip confirmed -> cancelled and refund its points.
--
-- Single-winner / idempotent by construction: only the call that actually flips the
-- status from 'confirmed' returns acted=true and refunds credits. A duplicate call,
-- or the charge.refunded webhook (which also flips a fully-refunded paid booking to
-- 'cancelled' but does NOT touch points), sees a non-'confirmed' status and no-ops
-- (acted=false) -- so the reward-points refund can never double-apply.
--
-- ASCII only, no less-than characters (the Supabase SQL editor mishandles them): the
-- not-cancellable branch uses status != 'confirmed' OR now() >= start_time, which is
-- the exact negation of "confirmed AND start_time is still in the future".
-- The function body uses a uniquely-named dollar-quote tag.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_confirmed_booking(p_booking_id uuid, p_user_id uuid)
RETURNS TABLE(acted boolean, credits_refunded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cancel_confirmed_booking$
DECLARE
  rec record;
  v_credits integer := 0;
BEGIN
  SELECT user_id, status, start_time, credits_used
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Booking gone -> nothing to cancel.
  IF NOT FOUND THEN
    acted := false;
    credits_refunded := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Ownership: only the booking's own user may cancel it. A guest booking
  -- (user_id IS NULL) is never cancellable through this user-facing RPC.
  IF rec.user_id IS DISTINCT FROM p_user_id THEN
    acted := false;
    credits_refunded := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Only a confirmed booking whose start_time is still in the FUTURE is cancellable.
  -- now() >= start_time means the booking has already started / is in the past, and a
  -- status other than 'confirmed' means it is already cancelled/expired/pending. In
  -- either case this call did NOT win the flip -> acted=false, no refund.
  IF rec.status != 'confirmed' OR now() >= rec.start_time THEN
    acted := false;
    credits_refunded := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Capture the points spent on this booking BEFORE zeroing them, so the refund
  -- amount is finalized under the lock.
  v_credits := COALESCE(rec.credits_used, 0);

  UPDATE public.bookings
  SET status       = 'cancelled',
      cancelled_at = now(),
      credits_used = 0
  WHERE id = p_booking_id;

  -- Return the reward points to the user's wallet. Only the single winning caller
  -- reaches this line, so it is safe against the charge.refunded webhook.
  IF v_credits > 0 THEN
    UPDATE public.wallets
    SET reward_credits = reward_credits + v_credits,
        updated_at     = now()
    WHERE user_id = p_user_id;
  END IF;

  acted := true;
  credits_refunded := v_credits;
  RETURN NEXT;
  RETURN;
END;
$cancel_confirmed_booking$;

REVOKE ALL ON FUNCTION public.cancel_confirmed_booking(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_confirmed_booking(uuid, uuid) TO service_role;
