-- Add discount_type and discount_value columns to voucher_codes.
-- These were missing from the original table definition but are required
-- by the admin voucher UI and the create-checkout-session edge function.

ALTER TABLE public.voucher_codes
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'free'
    CHECK (discount_type IN ('free', 'percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value integer NOT NULL DEFAULT 0;
