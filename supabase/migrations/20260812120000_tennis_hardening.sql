-- ============================================================================
-- Tennis — Haertung: Regeln als DB-Invarianten statt als Code-Konvention
-- ============================================================================
-- Ergaenzt 20260812100000. Hintergrund aus dem Design-Review:
--
-- 1. Eingeloggte Nutzer schreiben DIREKT in `bookings` (src/hooks/useBookingLocation.ts,
--    RLS-Insert ohne Edge Function). Eine 60-Minuten-Regel nur in den Edge Functions
--    haette also ausgerechnet den HAUPTPFAD ungeschuetzt gelassen. Sie gehoert in
--    den vorhandenen Trigger enforce_booking_window -- und zwar VOR dessen frueher
--    Rueckkehr fuer 24/7-Standorte.
--
-- 2. "Tennis gibt keine Punkte" darf nicht am fehleranfaelligsten Pfad haengen:
--    alle drei Payback-Stellen behandeln einen RPC-Fehler als "weiter mit x1,0".
--    Ein Timeout haette Punkte fuer Tennis erzeugt. Deshalb wird die Gutschrift
--    ueber eine RPC gefuehrt, die die Sportart selbst prueft.
--
-- 3. Nebenbei geschlossen: Der Webhook schreibt heute erst die Wallet gut und
--    setzt DANACH play_credits_awarded. Schlaegt der zweite Schritt fehl, schreibt
--    ein Stripe-Retry ERNEUT gut -- und der Storno-Clawback kann es nie zurueck-
--    holen, weil er genau diese Spalte liest. Die RPC macht beides in einer
--    Transaktion unter Row-Lock.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Baender: Sportart verpflichtend + Konsistenz deklarativ erzwungen
-- ---------------------------------------------------------------------------
-- "Global" heisst ab hier: global INNERHALB einer Sportart. Das ist eine reine
-- Verengung der bestehenden Regel und braucht keine zusaetzliche Stufe in der
-- Aufloesungsreihenfolge (sport ist ein reines WHERE-Praedikat).
UPDATE public.court_pricing_bands SET sport = 'padel' WHERE sport IS NULL;

ALTER TABLE public.court_pricing_bands ALTER COLUMN sport SET DEFAULT 'padel';
ALTER TABLE public.court_pricing_bands ALTER COLUMN sport SET NOT NULL;

-- Tennis kennt nur 60 Minuten. Ohne diesen CHECK waeren 90/120-Preise tote Werte,
-- die trotzdem in die "ab X EUR"-Anzeige einfliessen und etwas bewerben, das
-- gar nicht buchbar ist.
ALTER TABLE public.court_pricing_bands DROP CONSTRAINT IF EXISTS court_pricing_bands_tennis_60_only;
ALTER TABLE public.court_pricing_bands
  ADD CONSTRAINT court_pricing_bands_tennis_60_only
  CHECK (sport <> 'tennis' OR (price_cents_90 IS NULL AND price_cents_120 IS NULL));

-- Zusammengesetzter Fremdschluessel statt Trigger: Ein Court-Band MUSS die
-- Sportart seines Courts tragen, sonst waere es im Admin sichtbar, wuerde aber
-- nie greifen (stiller Konfigurationsfehler). MATCH SIMPLE heisst: bei
-- court_id IS NULL greift der FK nicht -- globale Baender waehlen ihre Sportart frei.
-- ON UPDATE CASCADE: Wird ein Court umgewidmet, wandern seine Baender mit.
ALTER TABLE public.courts DROP CONSTRAINT IF EXISTS courts_id_sport_key;
ALTER TABLE public.courts ADD CONSTRAINT courts_id_sport_key UNIQUE (id, sport);

DO $$
DECLARE
  v_name text;
BEGIN
  SELECT conname INTO v_name
  FROM pg_constraint
  WHERE conrelid = 'public.court_pricing_bands'::regclass
    AND contype = 'f'
    AND conname <> 'court_pricing_bands_court_sport_fkey'
  LIMIT 1;
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.court_pricing_bands DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE public.court_pricing_bands DROP CONSTRAINT IF EXISTS court_pricing_bands_court_sport_fkey;
ALTER TABLE public.court_pricing_bands
  ADD CONSTRAINT court_pricing_bands_court_sport_fkey
  FOREIGN KEY (court_id, sport) REFERENCES public.courts (id, sport)
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS public.court_pricing_bands_lookup_idx;
CREATE INDEX court_pricing_bands_lookup_idx
  ON public.court_pricing_bands (sport, court_id, start_minute)
  WHERE is_active;


-- ---------------------------------------------------------------------------
-- 2. resolve_booking_rate: Sport-Praedikat vereinfacht + fail closed bei Tennis
-- ---------------------------------------------------------------------------
-- Rueckgabetyp bleibt gleich -> CREATE OR REPLACE genuegt, Grants bleiben bestehen.
CREATE OR REPLACE FUNCTION public.resolve_booking_rate(
  p_court_id         uuid,
  p_start            timestamptz,
  p_duration_minutes integer
)
RETURNS TABLE (
  price_cents       integer,
  points_multiplier numeric,
  price_band_id     uuid,
  price_band_name   text,
  points_band_id    uuid,
  points_band_name  text,
  court_sport       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local     timestamp;
  v_dow       smallint;
  v_minute    smallint;
  v_sport     text;
  v_band      record;
  v_price     integer := NULL;
  v_price_id  uuid    := NULL;
  v_price_nm  text    := NULL;
  v_mult      numeric := NULL;
  v_mult_id   uuid    := NULL;
  v_mult_nm   text    := NULL;
BEGIN
  IF p_court_id IS NULL OR p_start IS NULL OR p_duration_minutes IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT c.sport INTO v_sport FROM public.courts c WHERE c.id = p_court_id;
  IF v_sport IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Tennis nur 60 Minuten: KEIN Preis statt stillem Rueckfall auf court_prices.
  -- Jeder Aufrufer bricht dann mit seiner vorhandenen "kein Preis"-Meldung ab.
  IF v_sport = 'tennis' AND p_duration_minutes <> 60 THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text, v_sport;
    RETURN;
  END IF;

  v_local  := p_start AT TIME ZONE 'Europe/Berlin';
  v_dow    := EXTRACT(ISODOW FROM v_local)::smallint;
  v_minute := (EXTRACT(HOUR FROM v_local) * 60 + EXTRACT(MINUTE FROM v_local))::smallint;

  FOR v_band IN
    SELECT b.id, b.name, b.price_cents_60, b.price_cents_90, b.price_cents_120, b.points_multiplier
    FROM public.court_pricing_bands b
    WHERE b.is_active
      AND b.sport = v_sport
      AND (b.court_id = p_court_id OR b.court_id IS NULL)
      AND v_dow = ANY (b.weekdays)
      AND v_minute >= b.start_minute
      AND v_minute <  b.end_minute
    ORDER BY (b.court_id IS NOT NULL) DESC, b.priority DESC, b.start_minute ASC, b.id ASC
  LOOP
    IF v_price IS NULL THEN
      v_price := CASE p_duration_minutes
                   WHEN 60  THEN v_band.price_cents_60
                   WHEN 90  THEN v_band.price_cents_90
                   WHEN 120 THEN v_band.price_cents_120
                   ELSE NULL
                 END;
      IF v_price IS NOT NULL THEN
        v_price_id := v_band.id;
        v_price_nm := v_band.name;
      END IF;
    END IF;

    IF v_mult IS NULL AND v_band.points_multiplier IS NOT NULL THEN
      v_mult    := v_band.points_multiplier;
      v_mult_id := v_band.id;
      v_mult_nm := v_band.name;
    END IF;

    EXIT WHEN v_price IS NOT NULL AND v_mult IS NOT NULL;
  END LOOP;

  IF v_price IS NULL THEN
    SELECT cp.price_cents INTO v_price
    FROM public.court_prices cp
    WHERE cp.court_id = p_court_id
      AND cp.duration_minutes = p_duration_minutes
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_price,
    COALESCE(v_mult, 1.0)::numeric,
    v_price_id, v_price_nm,
    v_mult_id,  v_mult_nm,
    v_sport;
END;
$$;


-- court_min_price_cents: bei Tennis zaehlen nur 60-Minuten-Preise, sonst wuerde
-- die "ab X EUR"-Anzeige mit nicht buchbaren Dauern nach unten verfaelscht.
CREATE OR REPLACE FUNCTION public.court_min_price_cents(p_court_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH court AS (
    SELECT c.id, c.sport FROM public.courts c WHERE c.id = p_court_id
  )
  SELECT MIN(price)::integer FROM (
    SELECT cp.price_cents AS price
    FROM public.court_prices cp
    CROSS JOIN court
    WHERE cp.court_id = p_court_id
      AND (court.sport <> 'tennis' OR cp.duration_minutes = 60)
    UNION ALL
    SELECT unnest(
             CASE WHEN court.sport = 'tennis'
                  THEN ARRAY[b.price_cents_60]
                  ELSE ARRAY[b.price_cents_60, b.price_cents_90, b.price_cents_120]
             END
           ) AS price
    FROM public.court_pricing_bands b
    JOIN court ON b.sport = court.sport
    WHERE b.is_active
      AND (b.court_id = p_court_id OR b.court_id IS NULL)
  ) prices
  WHERE price IS NOT NULL;
$$;


-- ---------------------------------------------------------------------------
-- 3. Buchungs-Trigger: Tennis nur 60 Minuten -- gilt auch fuer den direkten
--    Client-Insert eingeloggter Nutzer (der Hauptpfad!).
--    Die Pruefung steht BEWUSST vor der fruehen Rueckkehr fuer 24/7-Standorte.
-- ---------------------------------------------------------------------------
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
  v_sport text;
  v_duration integer;
BEGIN
  IF NEW.start_time < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'booking_in_past: start_time % liegt in der Vergangenheit', NEW.start_time;
  END IF;

  SELECT c.sport INTO v_sport FROM public.courts c WHERE c.id = NEW.court_id;
  IF v_sport = 'tennis' THEN
    v_duration := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::integer;
    IF v_duration <> 60 THEN
      RAISE EXCEPTION 'invalid_duration_for_sport: Tennis kann nur fuer 60 Minuten gebucht werden (% Minuten angefragt)', v_duration;
    END IF;
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

  v_open_min  := split_part(v_hours->>'open', ':', 1)::int * 60 + split_part(v_hours->>'open', ':', 2)::int;
  v_close_min := split_part(v_hours->>'close', ':', 1)::int * 60 + split_part(v_hours->>'close', ':', 2)::int;
  v_start_min := EXTRACT(HOUR FROM v_start_local)::int * 60 + EXTRACT(MINUTE FROM v_start_local)::int;

  IF v_end_local::date = v_start_local::date THEN
    v_end_min := EXTRACT(HOUR FROM v_end_local)::int * 60 + EXTRACT(MINUTE FROM v_end_local)::int;
  ELSIF v_end_local::date = v_start_local::date + 1 AND v_end_local::time = time '00:00' THEN
    v_end_min := 1440;
  ELSE
    RAISE EXCEPTION 'outside_opening_hours: Buchung ueberschreitet den Tag';
  END IF;

  IF v_start_min < v_open_min OR v_end_min > v_close_min THEN
    RAISE EXCEPTION 'outside_opening_hours: %-% liegt ausserhalb der Oeffnungszeiten (%-%)',
      v_start_min, v_end_min, v_open_min, v_close_min;
  END IF;

  RETURN NEW;
END;
$booking_window$;


-- ---------------------------------------------------------------------------
-- 4. award_booking_payback(): einziger Schreibpfad fuer Buchungs-Payback.
--    Macht "Tennis gibt keine Punkte" zur Datenbank-Invariante und schliesst
--    das bestehende Doppel-Gutschrift-Loch (Wallet + play_credits_awarded
--    jetzt in EINER Transaktion unter Row-Lock -> Webhook-Retry ist idempotent).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_booking_payback(
  p_booking_id uuid,
  p_points     integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $award$
DECLARE
  v_user    uuid;
  v_awarded integer;
  v_status  text;
  v_sport   text;
BEGIN
  IF p_booking_id IS NULL OR COALESCE(p_points, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT b.user_id, COALESCE(b.play_credits_awarded, 0), b.status::text, c.sport
    INTO v_user, v_awarded, v_status, v_sport
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  -- Gast (kein user_id), bereits vergeben, storniert oder nicht-Padel -> nichts.
  IF NOT FOUND
     OR v_user IS NULL
     OR v_awarded <> 0
     OR v_status = 'cancelled'
     OR v_sport IS DISTINCT FROM 'padel'
  THEN
    RETURN 0;
  END IF;

  UPDATE public.bookings
  SET play_credits_awarded = p_points
  WHERE id = p_booking_id;

  PERFORM public.increment_play_and_lifetime(v_user, p_points, p_points);

  RETURN p_points;
END;
$award$;

COMMENT ON FUNCTION public.award_booking_payback(uuid, integer) IS
  'Einziger Schreibpfad fuer Buchungs-Payback. Verweigert Tennis, Gaeste, Stornos und Doppelvergabe.';

REVOKE ALL ON FUNCTION public.award_booking_payback(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_booking_payback(uuid, integer) TO service_role;
