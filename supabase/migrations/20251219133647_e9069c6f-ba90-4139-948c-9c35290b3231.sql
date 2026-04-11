-- Create court_prices table for dynamic pricing
CREATE TABLE public.court_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duration_minutes integer NOT NULL UNIQUE,
  price_cents integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.court_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read prices
CREATE POLICY "Anyone can view court prices"
  ON public.court_prices FOR SELECT
  USING (true);

-- Policy: Only admins can manage prices
CREATE POLICY "Admins can manage court prices"
  ON public.court_prices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default prices
INSERT INTO public.court_prices (duration_minutes, price_cents) VALUES
  (60, 2400),
  (90, 3600),
  (120, 4000);

-- Create trigger for updated_at
CREATE TRIGGER update_court_prices_updated_at
  BEFORE UPDATE ON public.court_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();