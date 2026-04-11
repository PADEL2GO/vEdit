-- Drop the overly permissive policy that exposes all booking data
DROP POLICY IF EXISTS "Anyone can check availability" ON public.bookings;

-- Create a secure view that only exposes necessary columns for availability checking
-- This excludes user_id and other sensitive fields
CREATE OR REPLACE VIEW public.booking_availability AS
SELECT 
  court_id,
  location_id,
  start_time,
  end_time,
  status
FROM public.bookings
WHERE status IN ('pending', 'confirmed');

-- Grant access to the view for both anonymous and authenticated users
GRANT SELECT ON public.booking_availability TO anon, authenticated;