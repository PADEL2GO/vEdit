-- =============================================================================
-- Marketplace order refund/cancellation (admin-initiated).
-- Adds a 'refunded' status and refund_marketplace_order(): the paid-order mirror
-- of release_marketplace_order() — restores stock, refunds spent points and marks
-- the order refunded, atomically + idempotently (only a 'success' order flips).
-- The Stripe money refund is issued by the marketplace-refund edge function; this
-- RPC only reverses the database side.
-- =============================================================================

ALTER TABLE public.marketplace_redemptions
  DROP CONSTRAINT IF EXISTS marketplace_redemptions_status_check;
ALTER TABLE public.marketplace_redemptions
  ADD CONSTRAINT marketplace_redemptions_status_check
  CHECK (status IN ('success', 'failed', 'pending', 'cancelled', 'refunded'));

CREATE OR REPLACE FUNCTION public.refund_marketplace_order(p_order_id uuid)
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

  -- Idempotent: only a paid order can be refunded. A second call (or a retry after
  -- the Stripe refund already went through) is a no-op → no double stock/points refund.
  IF rec.status != 'success' THEN
    RETURN false;
  END IF;

  UPDATE public.marketplace_redemptions
  SET status             = 'refunded',
      fulfillment_status = 'cancelled'
  WHERE id = p_order_id;

  -- Give spent points back to the wallet.
  IF rec.user_id IS NOT NULL
     AND (COALESCE(rec.play_spent, 0) > 0 OR COALESCE(rec.reward_spent, 0) > 0) THEN
    UPDATE public.wallets
    SET play_credits   = play_credits + COALESCE(rec.play_spent, 0),
        reward_credits = reward_credits + COALESCE(rec.reward_spent, 0),
        updated_at     = now()
    WHERE user_id = rec.user_id;
  END IF;

  -- Put the reserved stock back ONLY if the order was not yet shipped — the physical
  -- unit is still in the warehouse. A shipped/delivered order that is refunded is a
  -- return; the admin re-adds stock manually once the item physically comes back, so we
  -- do not auto-restock here (that would inflate inventory and enable an oversell).
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

REVOKE ALL ON FUNCTION public.refund_marketplace_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_marketplace_order(uuid) TO service_role;
