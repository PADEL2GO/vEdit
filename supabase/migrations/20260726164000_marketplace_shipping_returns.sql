-- =============================================================================
-- MARKETPLACE SHIPPING & RETURNS (July 2026)
-- 1. Shipping: the success page/mail promised a tracking link that could never
--    be sent — there were no tracking columns and no shipping mail. Adds
--    tracking_number / carrier / shipped_at plus an idempotency stamp for the
--    new send-marketplace-shipped edge function.
-- 2. Returns: the shop advertises a 14-day right of withdrawal but customers
--    had no in-product way to exercise it. Adds a returns table with a status
--    workflow (requested -> received -> refunded/rejected), customer-creatable,
--    admin-managed.
-- =============================================================================

ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_confirmation_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.marketplace_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_redemptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'received', 'refunded', 'rejected')),
  admin_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open return per order.
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_returns_order_unique
  ON public.marketplace_returns (order_id);

ALTER TABLE public.marketplace_returns ENABLE ROW LEVEL SECURITY;

-- Customers may register a return for their own successful order and see it.
DROP POLICY IF EXISTS "Users can request returns" ON public.marketplace_returns;
CREATE POLICY "Users can request returns" ON public.marketplace_returns
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketplace_redemptions o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
        AND o.status = 'success'
    )
  );

DROP POLICY IF EXISTS "Users can view own returns" ON public.marketplace_returns;
CREATE POLICY "Users can view own returns" ON public.marketplace_returns
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage returns" ON public.marketplace_returns;
CREATE POLICY "Admins can manage returns" ON public.marketplace_returns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_marketplace_returns()
RETURNS trigger
LANGUAGE plpgsql
AS $touch_returns$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$touch_returns$;

DROP TRIGGER IF EXISTS trg_touch_marketplace_returns ON public.marketplace_returns;
CREATE TRIGGER trg_touch_marketplace_returns
  BEFORE UPDATE ON public.marketplace_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_returns();
