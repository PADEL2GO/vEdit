-- Drop and recreate the view with SECURITY INVOKER to use the querying user's permissions
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
WHERE status IN ('pending', 'confirmed');

-- Grant SELECT access to the view
GRANT SELECT ON public.booking_availability TO anon, authenticated;