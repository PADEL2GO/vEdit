-- Drop and recreate the booking_availability view
-- Only show pending_payment bookings if hold hasn't expired yet
DROP VIEW IF EXISTS public.booking_availability;

CREATE VIEW public.booking_availability AS
SELECT 
  court_id, 
  location_id, 
  start_time, 
  end_time, 
  status
FROM bookings
WHERE 
  -- Confirmed bookings: always count as occupied
  status = 'confirmed'
  OR
  -- Pending payment: only if hold hasn't expired yet
  (status = 'pending_payment' AND (hold_expires_at IS NULL OR hold_expires_at > NOW()));

-- Create cleanup function for expired pending_payment bookings
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE bookings 
  SET status = 'expired'
  WHERE status = 'pending_payment' 
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at < NOW();
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- Immediately clean up any existing expired bookings
UPDATE bookings 
SET status = 'expired'
WHERE status = 'pending_payment' 
  AND hold_expires_at IS NOT NULL
  AND hold_expires_at < NOW();