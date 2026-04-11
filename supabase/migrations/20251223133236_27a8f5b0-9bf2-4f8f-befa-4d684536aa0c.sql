-- Fix: Make booking_availability view use invoker's security context
DROP VIEW IF EXISTS booking_availability;
CREATE VIEW booking_availability 
WITH (security_invoker = on)
AS
SELECT court_id, location_id, start_time, end_time, status
FROM bookings
WHERE status = 'confirmed' 
   OR (status = 'pending_payment' AND (hold_expires_at IS NULL OR hold_expires_at > now()));