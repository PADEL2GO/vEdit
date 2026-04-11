
-- Voucher codes table
CREATE TABLE public.voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Voucher redemptions table
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.voucher_codes(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full CRUD on voucher_codes
CREATE POLICY "Admins can manage voucher codes"
  ON public.voucher_codes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Admins can see all redemptions
CREATE POLICY "Admins can view all voucher redemptions"
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Users can see own redemptions
CREATE POLICY "Users can view own voucher redemptions"
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger for voucher_codes
CREATE TRIGGER update_voucher_codes_updated_at
  BEFORE UPDATE ON public.voucher_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
