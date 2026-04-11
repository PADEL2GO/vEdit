CREATE OR REPLACE FUNCTION public.enforce_booking_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count FROM bookings
  WHERE user_id = NEW.user_id AND status IN ('pending','confirmed','pending_payment');
  IF active_count >= 3 THEN
    RAISE EXCEPTION 'Booking limit reached: max 3 active bookings per user';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_booking_limit
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_limit();