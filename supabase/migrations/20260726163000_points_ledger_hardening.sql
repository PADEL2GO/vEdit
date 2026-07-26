-- =============================================================================
-- POINTS LEDGER HARDENING (July 2026)
-- The ledger claimed to be "the ONLY source of truth" but (a) admins could
-- UPDATE/DELETE rows via PostgREST (FOR ALL policy), (b) account deletion hard-
-- deleted the audit trail, and (c) several wallet mutations never wrote a row
-- (booking payback EARN, post-settle refunds, booking cancel).
-- Ledger semantics: rows record SETTLED movements. Pre-settle holds and their
-- releases (reserve_points at checkout + refund_points on expiry) intentionally
-- leave no trace — they cancel out and the spend is only ledgered on settle.
--   1. Append-only trigger: no UPDATE/DELETE, except anonymisation (user_id
--      set to NULL, everything else unchanged — also fired by the FK action).
--   2. FK auth.users: CASCADE -> SET NULL (audit trail survives deletion,
--      matching the §147 AO retention applied to bookings/orders).
--   3. Admin RLS reduced to SELECT.
--   4. log_points_ledger() helper + ledger writes in increment_play_and_lifetime
--      (EARN), cancel_confirmed_booking (REVERSAL) and refund_marketplace_order
--      (REVERSAL; also records refund amount / Stripe refund id — new signature,
--      the marketplace-refund edge function passes them).
-- =============================================================================

-- 1./2. Retain rows on account deletion ----------------------------------------
ALTER TABLE public.points_ledger ALTER COLUMN user_id DROP NOT NULL;

DO $fk$
DECLARE v_con TEXT;
BEGIN
  SELECT conname INTO v_con
  FROM pg_constraint
  WHERE conrelid = 'public.points_ledger'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;
  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.points_ledger DROP CONSTRAINT %I', v_con);
  END IF;
  ALTER TABLE public.points_ledger
    ADD CONSTRAINT points_ledger_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
END;
$fk$;

-- Append-only guard. The only permitted mutation is anonymisation: user_id
-- becomes NULL while every other column stays identical (this is exactly what
-- the ON DELETE SET NULL foreign-key action performs).
CREATE OR REPLACE FUNCTION public.points_ledger_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $ledger_guard$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.user_id IS NULL
     AND OLD.reward_instance_id IS NOT DISTINCT FROM NEW.reward_instance_id
     AND OLD.delta_points = NEW.delta_points
     AND OLD.entry_type = NEW.entry_type
     AND OLD.balance_after IS NOT DISTINCT FROM NEW.balance_after
     AND OLD.description IS NOT DISTINCT FROM NEW.description
     AND OLD.created_at IS NOT DISTINCT FROM NEW.created_at
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'points_ledger is append-only (op %, row %)', TG_OP, OLD.id;
END;
$ledger_guard$;

DROP TRIGGER IF EXISTS trg_points_ledger_guard ON public.points_ledger;
CREATE TRIGGER trg_points_ledger_guard
  BEFORE UPDATE OR DELETE ON public.points_ledger
  FOR EACH ROW EXECUTE FUNCTION public.points_ledger_guard();

-- 3. Admin RLS: read-only ------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage points ledger" ON public.points_ledger;
DROP POLICY IF EXISTS "Admins can view points ledger" ON public.points_ledger;
CREATE POLICY "Admins can view points ledger" ON public.points_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Ledger write helper -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_points_ledger(
  p_user_id UUID,
  p_delta INTEGER,
  p_entry_type TEXT,
  p_credit_type TEXT,
  p_source_type TEXT,
  p_source_id TEXT,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $log_ledger$
DECLARE
  v_balance INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_delta, 0) = 0 THEN
    RETURN;
  END IF;
  SELECT COALESCE(play_credits, 0) + COALESCE(reward_credits, 0)
  INTO v_balance FROM public.wallets WHERE user_id = p_user_id;

  INSERT INTO public.points_ledger
    (user_id, delta_points, entry_type, credit_type, source_type, source_id, balance_after, description)
  VALUES
    (p_user_id, p_delta, p_entry_type, p_credit_type, p_source_type, p_source_id, COALESCE(v_balance, 0), p_description);
END;
$log_ledger$;

REVOKE ALL ON FUNCTION public.log_points_ledger(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_points_ledger(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 5. Booking payback EARN now leaves a ledger row ------------------------------
CREATE OR REPLACE FUNCTION public.increment_play_and_lifetime(
  p_user_id uuid,
  p_play_delta integer,
  p_lifetime_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $incr$
BEGIN
  INSERT INTO public.wallets (user_id, play_credits, lifetime_credits)
  VALUES (p_user_id, GREATEST(0, p_play_delta), GREATEST(0, p_lifetime_delta))
  ON CONFLICT (user_id) DO UPDATE
  SET play_credits     = GREATEST(0, public.wallets.play_credits + p_play_delta),
      lifetime_credits = GREATEST(0, public.wallets.lifetime_credits + p_lifetime_delta),
      updated_at       = now();

  PERFORM public.log_points_ledger(
    p_user_id, p_play_delta, 'AUTO_CREDIT', 'PLAY',
    'booking_payback', NULL, 'Booking Payback'
  );
END;
$incr$;

-- 6. Booking cancel: returned points leave a ledger row ------------------------
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

  IF NOT FOUND THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  IF rec.user_id IS DISTINCT FROM p_user_id THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  IF rec.status != 'confirmed' OR now() >= rec.start_time THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  v_credits := COALESCE(rec.credits_used, 0);

  UPDATE public.bookings
  SET status       = 'cancelled',
      cancelled_at = now(),
      credits_used = 0
  WHERE id = p_booking_id;

  IF v_credits > 0 THEN
    UPDATE public.wallets
    SET reward_credits = reward_credits + v_credits,
        updated_at     = now()
    WHERE user_id = p_user_id;

    PERFORM public.log_points_ledger(
      p_user_id, v_credits, 'REVERSAL', 'REWARD',
      'booking_cancel', p_booking_id::text, 'Buchung storniert — Points zurückgebucht'
    );
  END IF;

  acted := true;
  credits_refunded := v_credits;
  RETURN NEXT;
  RETURN;
END;
$cancel_confirmed_booking$;

-- 7. Marketplace refund: ledger rows + refund record. New signature — the old
--    single-arg version is dropped so PostgREST rpc name resolution stays unique.
DROP FUNCTION IF EXISTS public.refund_marketplace_order(uuid);

CREATE OR REPLACE FUNCTION public.refund_marketplace_order(
  p_order_id uuid,
  p_refund_amount_cents integer,
  p_stripe_refund_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_refund_order$
DECLARE
  rec record;
BEGIN
  SELECT user_id, status, fulfillment_status, item_id, quantity, play_spent, reward_spent, stock_reserved
  INTO rec
  FROM public.marketplace_redemptions
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF rec.status != 'success' THEN
    RETURN false;
  END IF;

  UPDATE public.marketplace_redemptions
  SET status              = 'refunded',
      fulfillment_status  = 'cancelled',
      refund_amount_cents = p_refund_amount_cents,
      refunded_at         = now(),
      stripe_refund_id    = p_stripe_refund_id
  WHERE id = p_order_id;

  IF rec.user_id IS NOT NULL
     AND (COALESCE(rec.play_spent, 0) > 0 OR COALESCE(rec.reward_spent, 0) > 0) THEN
    UPDATE public.wallets
    SET play_credits   = play_credits + COALESCE(rec.play_spent, 0),
        reward_credits = reward_credits + COALESCE(rec.reward_spent, 0),
        updated_at     = now()
    WHERE user_id = rec.user_id;

    IF COALESCE(rec.play_spent, 0) > 0 THEN
      PERFORM public.log_points_ledger(
        rec.user_id, rec.play_spent, 'REVERSAL', 'PLAY',
        'marketplace_refund', p_order_id::text, 'Bestellung erstattet — Points zurückgebucht'
      );
    END IF;
    IF COALESCE(rec.reward_spent, 0) > 0 THEN
      PERFORM public.log_points_ledger(
        rec.user_id, rec.reward_spent, 'REVERSAL', 'REWARD',
        'marketplace_refund', p_order_id::text, 'Bestellung erstattet — Points zurückgebucht'
      );
    END IF;
  END IF;

  IF COALESCE(rec.stock_reserved, false) AND rec.fulfillment_status = 'pending' THEN
    UPDATE public.marketplace_items
    SET stock_quantity = stock_quantity + COALESCE(rec.quantity, 0),
        updated_at     = now()
    WHERE id = rec.item_id
      AND stock_quantity IS NOT NULL;
  END IF;

  RETURN true;
END;
$mp_refund_order$;

REVOKE ALL ON FUNCTION public.refund_marketplace_order(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_marketplace_order(uuid, integer, text) TO service_role;
