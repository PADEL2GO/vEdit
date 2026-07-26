-- =============================================================================
-- RECEIPTS, TAX FIELDS & REFUND RECORDS (July 2026 — GoBD/USt groundwork)
-- Until now no transaction produced any Beleg: no sequential numbering, no VAT
-- split, refund amounts were discarded. This migration adds:
--   1. Economic snapshot columns on marketplace orders (gross/discount/tax at
--      time of sale — the live item price is mutable and NOT a record).
--   2. Refund records on orders and payments (amount, timestamp, Stripe id).
--   3. A receipts table with a gapless per-year number sequence
--      (P2G-<year>-<nnnnnn>) written only via create_receipt() under lock.
-- VAT model: prices are gross, Regelsteuersatz 19 %. Points discounts are an
-- Entgeltminderung (§ 17 UStG): VAT is computed on the amount actually paid.
-- =============================================================================

-- 1. Order economic snapshot ---------------------------------------------------
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS gross_cents INTEGER,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,2) NOT NULL DEFAULT 19.00,
  ADD COLUMN IF NOT EXISTS tax_cents INTEGER,
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

-- 2. Booking payment refund record --------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

-- 3. Receipts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_type TEXT NOT NULL CHECK (receipt_type IN
    ('marketplace_order', 'marketplace_refund', 'booking', 'booking_refund')),
  source_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  description TEXT,
  gross_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  paid_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  tax_rate NUMERIC(4,2) NOT NULL DEFAULT 19.00,
  tax_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One receipt per (type, source): retries of webhooks/refunds are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS receipts_type_source_unique
  ON public.receipts (receipt_type, source_id);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
CREATE POLICY "Users can view own receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view receipts" ON public.receipts;
CREATE POLICY "Admins can view receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Gapless numbering: a plain sequence leaks numbers on rollback; a counter row
-- locked FOR UPDATE inside the same transaction as the receipt insert is gapless.
CREATE TABLE IF NOT EXISTS public.receipt_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.create_receipt(
  p_receipt_type TEXT,
  p_source_id UUID,
  p_user_id UUID,
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_description TEXT,
  p_gross_cents INTEGER,
  p_discount_cents INTEGER,
  p_paid_cents INTEGER,
  p_tax_rate NUMERIC
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $create_receipt$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_num INTEGER;
  v_tax_cents INTEGER;
  v_rate NUMERIC := COALESCE(p_tax_rate, 19.00);
  v_row public.receipts;
BEGIN
  -- Idempotent: an existing receipt for this source is returned unchanged.
  SELECT * INTO v_row FROM public.receipts
  WHERE receipt_type = p_receipt_type AND source_id = p_source_id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.receipt_counters (year, last_number)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  SELECT last_number + 1 INTO v_num
  FROM public.receipt_counters WHERE year = v_year FOR UPDATE;

  UPDATE public.receipt_counters SET last_number = v_num WHERE year = v_year;

  -- VAT on the amount actually paid (Entgeltminderung for points discounts).
  -- Refund receipts carry negative amounts; ROUND works symmetrically.
  v_tax_cents := ROUND(p_paid_cents - (p_paid_cents / (1 + v_rate / 100.0)))::INTEGER;

  INSERT INTO public.receipts (
    receipt_number, receipt_type, source_id, user_id, recipient_email,
    recipient_name, description, gross_cents, discount_cents, paid_cents,
    net_cents, tax_rate, tax_cents
  ) VALUES (
    'P2G-' || v_year || '-' || LPAD(v_num::TEXT, 6, '0'),
    p_receipt_type, p_source_id, p_user_id, p_recipient_email,
    p_recipient_name, p_description, p_gross_cents,
    COALESCE(p_discount_cents, 0), p_paid_cents,
    p_paid_cents - v_tax_cents, v_rate, v_tax_cents
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$create_receipt$;

REVOKE ALL ON FUNCTION public.create_receipt(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_receipt(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) TO service_role;
