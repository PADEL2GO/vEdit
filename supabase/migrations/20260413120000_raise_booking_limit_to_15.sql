-- Raise the per-user active booking limit from 3 to 15.
-- The previous trigger blocked all booking INSERT attempts once a user
-- had 3 rows with status in ('pending','confirmed','pending_payment').
CREATE OR REPLACE FUNCTION public.enforce_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE active_count INTEGER;
BEGIN
  -- Guest bookings (user_id IS NULL) are exempt
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count FROM bookings
  WHERE user_id = NEW.user_id AND status IN ('pending','confirmed','pending_payment');
  IF active_count >= 15 THEN
    RAISE EXCEPTION 'Booking limit reached: max 15 active bookings per user';
  END IF;
  RETURN NEW;
END;
$function$;
