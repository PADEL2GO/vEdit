-- =============================================================================
-- MARKETPLACE SETTLE / RELEASE / STOCK (July 2026)
-- Gives the money+points marketplace flow (marketplace-checkout + stripe-webhook)
-- the same settle-or-refund guarantee the booking flow already has:
--   * settle_marketplace_order  -> flip a paid pending order to success (idempotent)
--   * release_marketplace_order -> cancel an unpaid/expired pending order, refund the
--                                  reserved points and restore the reserved stock
--   * insert_marketplace_order  -> create the pending order under a per-(user,item)
--                                  advisory lock so a rapid double-submit cannot create
--                                  two independent orders (mirrors claim_checkout)
--   * marketplace_decrement_stock / marketplace_restore_stock -> ATOMIC column-relative
--                                  stock moves (no stale-read absolute writes -> no oversell)
--   * cleanup_expired_marketplace_orders -> pg_cron backstop that releases abandoned
--                                  pending orders whose Stripe session expired
-- Every function body uses a uniquely-named dollar-quote tag so the Supabase SQL
-- editor never mis-pairs delimiters across the bodies.
-- =============================================================================

-- Units ordered (needed to restore stock on release) and the abandon deadline the
-- cron backstop scans (mirrors bookings.hold_expires_at).
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz;

-- True only for orders that actually decremented stock at checkout. release must restore
-- stock strictly from THIS flag (never from the item's current stock_quantity), otherwise
-- a NULL-stock (unlimited) order, or a lost-race order that never decremented, would credit
-- phantom units if the item later starts tracking stock. Nullable on purpose: the insert
-- RPC's jsonb_populate_record leaves absent keys NULL, and release treats NULL as false.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS stock_reserved boolean DEFAULT false;

-- Idempotency marker for the paid-order fulfillment notification (the physical-ship email
-- to contact@padel2go.eu). Set ONLY after that email actually sends, so a retried Stripe
-- webhook re-attempts an interrupted send instead of silently dropping it -- the settle
-- transition is consumed once, but fulfillment must be able to complete across retries.
-- Distinct from fulfillment_status (which drives the admin ship queue): a notified order
-- stays 'pending' there until an admin marks it shipped.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS fulfillment_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketplace_redemptions_pending_hold
  ON public.marketplace_redemptions(hold_expires_at)
  WHERE status = 'pending';

-- marketplace_decrement_stock: reserve units with an ATOMIC guarded decrement. The
-- row is locked FOR UPDATE so concurrent buyers serialize; a stale absolute write can
-- no longer clobber a sibling decrement (the oversell bug). NULL stock = unlimited.
CREATE OR REPLACE FUNCTION public.marketplace_decrement_stock(p_item_id uuid, p_quantity integer, p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_decrement_stock$
DECLARE
  v_stock integer;
BEGIN
  SELECT stock_quantity INTO v_stock
  FROM public.marketplace_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_stock IS NULL THEN
    RETURN true;
  END IF;

  IF p_quantity > v_stock THEN
    RETURN false;
  END IF;

  UPDATE public.marketplace_items
  SET stock_quantity = v_stock - p_quantity,
      updated_at     = now()
  WHERE id = p_item_id;

  -- Flag the order as stock-reserved in the SAME transaction as the decrement. A separate
  -- post-decrement flag write could fail (or the process could die) after the stock was
  -- already taken, leaving a decremented-but-unflagged order that release never restocks
  -- (permanent inventory deflation). Doing it here makes decrement+flag atomic.
  UPDATE public.marketplace_redemptions
  SET stock_reserved = true
  WHERE id = p_order_id;

  RETURN true;
END;
$mp_decrement_stock$;

REVOKE ALL ON FUNCTION public.marketplace_decrement_stock(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_decrement_stock(uuid, integer, uuid) TO service_role;

-- marketplace_restore_stock: give units back with an ATOMIC column-relative increment
-- (never a stale-read absolute value, which would create phantom units under concurrency).
CREATE OR REPLACE FUNCTION public.marketplace_restore_stock(p_item_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_restore_stock$
BEGIN
  UPDATE public.marketplace_items
  SET stock_quantity = stock_quantity + GREATEST(0, COALESCE(p_quantity, 0)),
      updated_at     = now()
  WHERE id = p_item_id
    AND stock_quantity IS NOT NULL;
END;
$mp_restore_stock$;

REVOKE ALL ON FUNCTION public.marketplace_restore_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_restore_stock(uuid, integer) TO service_role;

-- insert_marketplace_order: create the pending order AND reserve the points in ONE txn.
-- For a logged-in user it first takes a per-(user,item) transaction advisory lock and
-- rejects (returns no row) when a STILL-LIVE order for the same item already exists, so a
-- double-submit cannot create two independent orders (double points debited / double
-- physical ship). The guard must cover the whole payable life of a pending order (until
-- hold_expires_at, past the 30-min Stripe session), not just the first couple of minutes,
-- otherwise two simultaneously-payable orders could coexist. A recent success is also
-- blocked briefly to swallow a rapid free-path double-click. This is the marketplace
-- equivalent of claim_checkout, adapted to the one-row-per-request model. Guests
-- (user_id NULL) are cash-only and self-heal via release, so they skip the lock and just
-- insert.
--
-- The point debit (reserve_points) runs HERE, AFTER the duplicate guard, in the SAME
-- transaction as the insert -- never as a separate pre-insert RPC. That closes a
-- wrong-money hole: previously the wallet was debited in its own committed txn before the
-- row existed, so a rejected duplicate, or a failed insert, left points debited with no
-- durable row keyed to them and only a best-effort out-of-band refund_points (a logged
-- failure = permanently stranded points) to recover. Now a duplicate returns before any
-- debit, and any insert failure rolls the debit back with the txn. The actual play/reward
-- split reserve took is written onto the row (release/settle read those columns) and
-- returned so the caller can correct the discount if a concurrent spend left the wallet
-- short (reserve then takes 0).
CREATE OR REPLACE FUNCTION public.insert_marketplace_order(p_order jsonb, p_reserve integer DEFAULT 0)
RETURNS TABLE (order_id uuid, play_reserved integer, reward_reserved integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_insert_order$
DECLARE
  v_user   uuid := NULLIF(p_order->>'user_id', '')::uuid;
  v_item   uuid := (p_order->>'item_id')::uuid;
  v_id     uuid;
  v_play   integer := 0;
  v_reward integer := 0;
BEGIN
  IF v_user IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_item::text, 0));

    IF EXISTS (
      SELECT 1 FROM public.marketplace_redemptions
      WHERE user_id = v_user
        AND item_id = v_item
        AND (
          (status = 'pending' AND (hold_expires_at IS NULL OR hold_expires_at > now()))
          OR (status = 'success' AND created_at > now() - interval '2 minutes')
        )
    ) THEN
      RETURN;
    END IF;
  END IF;

  IF v_user IS NOT NULL AND COALESCE(p_reserve, 0) > 0 THEN
    SELECT r.play_spent, r.reward_spent INTO v_play, v_reward
    FROM public.reserve_points(v_user, p_reserve) AS r;
  END IF;

  INSERT INTO public.marketplace_redemptions
  SELECT * FROM jsonb_populate_record(NULL::public.marketplace_redemptions, p_order)
  RETURNING id INTO v_id;

  UPDATE public.marketplace_redemptions
  SET play_spent   = v_play,
      reward_spent = v_reward,
      credit_cost  = v_play + v_reward
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, v_play, v_reward;
END;
$mp_insert_order$;

REVOKE ALL ON FUNCTION public.insert_marketplace_order(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_marketplace_order(jsonb, integer) TO service_role;

-- settle_marketplace_order: confirm a PAID pending order. Row-locked + idempotent +
-- pending-only, so a duplicate/retried webhook (or a session a sibling already settled)
-- returns false and the caller must NOT re-ship or re-ledger.
CREATE OR REPLACE FUNCTION public.settle_marketplace_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_settle_order$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.marketplace_redemptions
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_status = 'pending' THEN
    UPDATE public.marketplace_redemptions
    SET status = 'success'
    WHERE id = p_order_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$mp_settle_order$;

REVOKE ALL ON FUNCTION public.settle_marketplace_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_marketplace_order(uuid) TO service_role;

-- release_marketplace_order: cancel an unpaid/expired PENDING order and undo its holds --
-- refund the reserved points to the wallet and restore the reserved stock. Row-locked +
-- idempotent + pending-only, so the webhook expired branch and the cron backstop can both
-- call it without ever double-refunding or double-restoring.
CREATE OR REPLACE FUNCTION public.release_marketplace_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_release_order$
DECLARE
  rec record;
BEGIN
  SELECT user_id, status, item_id, quantity, play_spent, reward_spent, stock_reserved
  INTO rec
  FROM public.marketplace_redemptions
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF rec.status != 'pending' THEN
    RETURN false;
  END IF;

  UPDATE public.marketplace_redemptions
  SET status             = 'cancelled',
      fulfillment_status = 'cancelled'
  WHERE id = p_order_id;

  IF rec.user_id IS NOT NULL
     AND (COALESCE(rec.play_spent, 0) > 0 OR COALESCE(rec.reward_spent, 0) > 0) THEN
    UPDATE public.wallets
    SET play_credits   = play_credits + COALESCE(rec.play_spent, 0),
        reward_credits = reward_credits + COALESCE(rec.reward_spent, 0),
        updated_at     = now()
    WHERE user_id = rec.user_id;
  END IF;

  IF COALESCE(rec.stock_reserved, false) THEN
    UPDATE public.marketplace_items
    SET stock_quantity = stock_quantity + COALESCE(rec.quantity, 0),
        updated_at     = now()
    WHERE id = rec.item_id
      AND stock_quantity IS NOT NULL;
  END IF;

  RETURN true;
END;
$mp_release_order$;

REVOKE ALL ON FUNCTION public.release_marketplace_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_marketplace_order(uuid) TO service_role;

-- cleanup_expired_marketplace_orders: pg_cron backstop. Releases pending orders whose
-- hold deadline passed (the Stripe session has expired and no completed webhook settled
-- them), mirroring cleanup_expired_bookings. The single release RPC keeps it race-free
-- against a late expired webhook.
CREATE OR REPLACE FUNCTION public.cleanup_expired_marketplace_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_cleanup$
DECLARE
  affected_rows integer := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.marketplace_redemptions
    WHERE status = 'pending'
      AND hold_expires_at IS NOT NULL
      AND now() > hold_expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_marketplace_order(rec.id);
    affected_rows := affected_rows + 1;
  END LOOP;

  RETURN affected_rows;
END;
$mp_cleanup$;

REVOKE ALL ON FUNCTION public.cleanup_expired_marketplace_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_marketplace_orders() TO service_role;

SELECT cron.unschedule('cleanup-expired-marketplace-orders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-marketplace-orders'
);

SELECT cron.schedule(
  'cleanup-expired-marketplace-orders',
  '* * * * *',
  $mp_cron$SELECT public.cleanup_expired_marketplace_orders()$mp_cron$
);
