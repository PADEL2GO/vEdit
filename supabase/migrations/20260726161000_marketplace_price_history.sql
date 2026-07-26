-- =============================================================================
-- MARKETPLACE PRICE HISTORY (July 2026)
-- § 11 PAngV: every price reduction must state the lowest total price of the
-- last 30 days. Admin edits previously overwrote price_cents in place with no
-- trace. This adds an automatic history (trigger on price change), a backfill
-- of current prices, and a read function for the shop frontend.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.marketplace_price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_price_history_item_time
  ON public.marketplace_price_history (item_id, changed_at DESC);

ALTER TABLE public.marketplace_price_history ENABLE ROW LEVEL SECURITY;

-- Prices are public information (they are shown in the shop) — read for everyone,
-- writes only via the trigger (definer context) / service role.
DROP POLICY IF EXISTS "Price history is public" ON public.marketplace_price_history;
CREATE POLICY "Price history is public" ON public.marketplace_price_history
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.log_marketplace_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $log_mp_price$
BEGIN
  IF NEW.price_cents IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR OLD.price_cents IS DISTINCT FROM NEW.price_cents THEN
    INSERT INTO public.marketplace_price_history (item_id, price_cents)
    VALUES (NEW.id, NEW.price_cents);
  END IF;
  RETURN NEW;
END;
$log_mp_price$;

DROP TRIGGER IF EXISTS trg_log_marketplace_price ON public.marketplace_items;
CREATE TRIGGER trg_log_marketplace_price
  AFTER INSERT OR UPDATE OF price_cents ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION public.log_marketplace_price();

-- Backfill: seed the history with every current price so the 30-day window
-- starts counting from today.
INSERT INTO public.marketplace_price_history (item_id, price_cents)
SELECT id, price_cents FROM public.marketplace_items
WHERE price_cents IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.marketplace_price_history h WHERE h.item_id = marketplace_items.id
  );

-- Lowest price effective at any point during the trailing 30 days:
-- LEAST(price in effect at window start, all prices set within the window).
CREATE OR REPLACE FUNCTION public.marketplace_lowest_price_30d(p_item_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $lowest30$
  SELECT LEAST(
    COALESCE((
      SELECT h.price_cents FROM public.marketplace_price_history h
      WHERE h.item_id = p_item_id AND h.changed_at <= now() - interval '30 days'
      ORDER BY h.changed_at DESC LIMIT 1
    ), 2147483647),
    COALESCE((
      SELECT MIN(h.price_cents) FROM public.marketplace_price_history h
      WHERE h.item_id = p_item_id AND h.changed_at > now() - interval '30 days'
    ), 2147483647),
    COALESCE((
      SELECT i.price_cents FROM public.marketplace_items i WHERE i.id = p_item_id
    ), 2147483647)
  );
$lowest30$;

GRANT EXECUTE ON FUNCTION public.marketplace_lowest_price_30d(uuid) TO anon, authenticated, service_role;
