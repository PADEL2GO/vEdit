-- =============================================================================
-- Shorten the checkout-claim staleness window from 2 minutes to 30 seconds so a
-- user whose Stripe redirect crashed/was abandoned can retry payment quickly. A
-- genuine concurrent double-click still serializes (the two requests arrive within
-- ~1s; the loser sees the fresh claim and is rejected), while a sequential retry
-- reclaims after 30s. The edge function additionally returns the existing still-open
-- Stripe session on rejection, so most retries succeed instantly regardless.
-- =============================================================================

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
     OR (now() - interval '30 seconds') > rec.checkout_claimed_at THEN
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
