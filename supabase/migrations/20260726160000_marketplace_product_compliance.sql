-- =============================================================================
-- MARKETPLACE PRODUCT COMPLIANCE (July 2026)
-- GPSR (EU 2023/988) Art. 19 requires the shop to display manufacturer (and,
-- for non-EU manufacturers, the EU responsible person) with postal address and
-- email, a product identifier, and any warnings — per product. TextilKennzVO
-- requires fibre composition for apparel. PAngV needs a per-product base price
-- for goods sold by measure. Delivery time must be stated per product.
-- All fields nullable: existing products keep working, admin fills them in.
-- =============================================================================

ALTER TABLE public.marketplace_items
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_address TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_email TEXT,
  ADD COLUMN IF NOT EXISTS eu_responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS eu_responsible_address TEXT,
  ADD COLUMN IF NOT EXISTS eu_responsible_email TEXT,
  ADD COLUMN IF NOT EXISTS product_identifier TEXT,
  ADD COLUMN IF NOT EXISTS safety_warnings TEXT,
  ADD COLUMN IF NOT EXISTS textile_composition TEXT,
  ADD COLUMN IF NOT EXISTS delivery_days_min INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS delivery_days_max INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS base_price_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS base_price_unit TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,2) NOT NULL DEFAULT 19.00;

COMMENT ON COLUMN public.marketplace_items.base_price_quantity IS
  'Content quantity for PAngV base price (e.g. 12 for a 12m grip tape roll); unit in base_price_unit. NULL = piece goods, no base price required.';
COMMENT ON COLUMN public.marketplace_items.eu_responsible_name IS
  'GPSR Art. 16 EU responsible person — only needed when the manufacturer is outside the EU.';
