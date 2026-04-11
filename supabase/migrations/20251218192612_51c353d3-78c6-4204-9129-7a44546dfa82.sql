-- Add payment-related columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price_cents integer,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS hold_expires_at timestamp with time zone;

-- Create payments table for tracking Stripe payments
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can only read their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update booking_availability view to include pending_payment status
DROP VIEW IF EXISTS public.booking_availability;

CREATE VIEW public.booking_availability
WITH (security_invoker = true)
AS
SELECT 
  court_id,
  location_id,
  start_time,
  end_time,
  status
FROM public.bookings
WHERE status IN ('pending', 'confirmed', 'pending_payment');

GRANT SELECT ON public.booking_availability TO anon, authenticated;