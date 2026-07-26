-- =============================================================================
-- SERVER-SIDE BOOKING WINDOW ENFORCEMENT (July 2026, REQ-G06)
-- Opening hours were only applied client-side (useBookingSlots); a crafted
-- request to create-guest-booking or a direct authenticated INSERT could book
-- a 3 AM or past slot — a direct conflict with Baugenehmigung/BImSchV limits.
-- This trigger is the authoritative backstop on EVERY bookings INSERT:
--   1. start_time must not lie in the past (15 min grace for in-flight checkouts)
--   2. the slot must fit the location's opening hours for that weekday,
--      evaluated in Europe/Berlin (the JSON times are local wall-clock times);
--      is_24_7 locations skip the hours check.
-- The edge functions add the same checks for friendly error messages; this
-- trigger guarantees them even for paths that bypass the functions.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_booking_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $booking_window$
DECLARE
  v_is_24_7 boolean;
  v_hours_json jsonb;
  v_start_local timestamp;
  v_end_local timestamp;
  v_day text;
  v_hours jsonb;
  v_open_min integer;
  v_close_min integer;
  v_start_min integer;
  v_end_min integer;
BEGIN
  IF NEW.start_time < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'booking_in_past: start_time % liegt in der Vergangenheit', NEW.start_time;
  END IF;

  SELECT is_24_7, opening_hours_json
  INTO v_is_24_7, v_hours_json
  FROM public.locations
  WHERE id = NEW.location_id;

  IF NOT FOUND OR COALESCE(v_is_24_7, false) OR v_hours_json IS NULL THEN
    RETURN NEW;
  END IF;

  v_start_local := NEW.start_time AT TIME ZONE 'Europe/Berlin';
  v_end_local   := NEW.end_time   AT TIME ZONE 'Europe/Berlin';

  v_day := (ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])
           [EXTRACT(DOW FROM v_start_local)::int + 1];
  v_hours := v_hours_json -> v_day;

  IF v_hours IS NULL OR v_hours->>'open' IS NULL OR v_hours->>'close' IS NULL THEN
    RAISE EXCEPTION 'outside_opening_hours: % ist an diesem Tag geschlossen', v_day;
  END IF;

  -- Minutes since local midnight of the start day; a slot ending exactly at
  -- local midnight counts as 24:00 of the start day.
  v_open_min  := split_part(v_hours->>'open', ':', 1)::int * 60 + split_part(v_hours->>'open', ':', 2)::int;
  v_close_min := split_part(v_hours->>'close', ':', 1)::int * 60 + split_part(v_hours->>'close', ':', 2)::int;
  v_start_min := EXTRACT(HOUR FROM v_start_local)::int * 60 + EXTRACT(MINUTE FROM v_start_local)::int;

  IF v_end_local::date = v_start_local::date THEN
    v_end_min := EXTRACT(HOUR FROM v_end_local)::int * 60 + EXTRACT(MINUTE FROM v_end_local)::int;
  ELSIF v_end_local::date = v_start_local::date + 1 AND v_end_local::time = time '00:00' THEN
    v_end_min := 1440;
  ELSE
    RAISE EXCEPTION 'outside_opening_hours: Buchung überschreitet den Tag';
  END IF;

  IF v_start_min < v_open_min OR v_end_min > v_close_min THEN
    RAISE EXCEPTION 'outside_opening_hours: %–% liegt außerhalb der Öffnungszeiten (%–%)',
      v_start_min, v_end_min, v_open_min, v_close_min;
  END IF;

  RETURN NEW;
END;
$booking_window$;

DROP TRIGGER IF EXISTS trg_enforce_booking_window ON public.bookings;
CREATE TRIGGER trg_enforce_booking_window
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_window();
