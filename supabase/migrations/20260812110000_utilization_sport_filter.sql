-- ============================================================
-- Auslastung nach Sportart trennbar
-- Baut auf 20260620130000_court_utilization_security_fixes.sql auf und
-- ergaenzt die drei Auswertungs-RPCs um `p_sport` (NULL = alle Sportarten).
--
-- Warum serverseitig: die Seite bildet Summen ueber die zurueckgegebenen
-- Zeilen (Netzwerk-Auslastung, gebuchte/moegliche Stunden, Umsatz). Ein reiner
-- Frontend-Filter wuerde die Tabelle filtern, die Kennzahlen darueber aber
-- weiter aus ALLEN Sportarten bilden — also falsche Zahlen zeigen.
--
-- Die Berechtigungslogik (Admin sieht alles, Club-Manager nur zugewiesene
-- Courts; revenue_cents NULL fuer Club-Manager) ist unveraendert uebernommen —
-- der Sport-Filter kommt ausschliesslich additiv dazu.
--
-- DROP vor CREATE, weil:
--   * get_court_utilization einen neuen Rueckgabetyp bekommt (Spalte `sport`)
--     -> CREATE OR REPLACE ist nicht moeglich
--   * ein neuer Parameter MIT DEFAULT sonst eine mehrdeutige Ueberladung neben
--     der alten Signatur erzeugt (Aufruf mit den alten Argumenten waere dann
--     "function is not unique")
-- ============================================================

DROP FUNCTION IF EXISTS public.get_court_utilization(date);
DROP FUNCTION IF EXISTS public.get_court_utilization_trend(uuid, int);
DROP FUNCTION IF EXISTS public.get_network_utilization_trend(int);

-- ------------------------------------------------------------
-- Per-court utilization for one month.
-- C1: revenue only for admins. H3: GREATEST guards negative durations.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_court_utilization(
  p_month_start date,
  p_sport       text DEFAULT NULL
)
RETURNS TABLE(
  court_id         uuid,
  court_name       text,
  sport            text,
  location_id      uuid,
  location_name    text,
  location_city    text,
  is_active        boolean,
  is_online        boolean,
  possible_minutes integer,
  booked_minutes   integer,
  bookings_count   integer,
  capacity_pct     numeric,
  revenue_cents    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text := auth.jwt() ->> 'email';
  v_is_admin  boolean;
  v_month     date := date_trunc('month', p_month_start)::date;
  v_month_end date := (date_trunc('month', p_month_start) + interval '1 month')::date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF p_sport IS NOT NULL AND p_sport NOT IN ('padel', 'tennis') THEN
    RAISE EXCEPTION 'p_sport must be padel or tennis';
  END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  RETURN QUERY
  WITH authorized_courts AS (
    -- Admin: all courts at ONLINE locations (network view)
    SELECT c.id
    FROM public.courts c
    JOIN public.locations l ON l.id = c.location_id
    WHERE v_is_admin AND l.is_online = true
      AND (p_sport IS NULL OR c.sport = p_sport)
    UNION
    -- Manager (new model): assigned courts, regardless of location online state (L1)
    SELECT cca.court_id
    FROM public.club_court_assignments cca
    JOIN public.club_users cu ON cu.club_id = cca.club_id
    WHERE NOT v_is_admin AND cu.user_id = v_uid AND cu.is_active = true
      AND (p_sport IS NULL OR EXISTS (
        SELECT 1 FROM public.courts sc WHERE sc.id = cca.court_id AND sc.sport = p_sport
      ))
    UNION
    -- Manager (legacy model)
    SELECT coa.court_id
    FROM public.club_owner_assignments coa
    WHERE NOT v_is_admin AND coa.user_id = v_uid
      AND (p_sport IS NULL OR EXISTS (
        SELECT 1 FROM public.courts sc WHERE sc.id = coa.court_id AND sc.sport = p_sport
      ))
  ),
  booking_agg AS (
    SELECT
      b.court_id AS c_id,
      COALESCE(SUM(GREATEST(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60, 0)), 0)::int AS booked_minutes,
      COUNT(*)::int AS bookings_count,
      COALESCE(SUM(b.price_cents), 0)::bigint AS revenue_cents
    FROM public.bookings b
    JOIN public.courts bc ON bc.id = b.court_id
    JOIN public.locations bl ON bl.id = bc.location_id
    WHERE b.court_id IN (SELECT id FROM authorized_courts)
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE bl.timezone) >= v_month::timestamp
      AND (b.start_time AT TIME ZONE bl.timezone) <  v_month_end::timestamp
    GROUP BY b.court_id
  )
  SELECT
    c.id,
    c.name,
    c.sport,
    l.id,
    l.name,
    l.city,
    c.is_active,
    l.is_online,
    public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month) AS possible_minutes,
    COALESCE(ba.booked_minutes, 0) AS booked_minutes,
    COALESCE(ba.bookings_count, 0) AS bookings_count,
    CASE
      WHEN public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month) > 0
        THEN round(100.0 * COALESCE(ba.booked_minutes, 0)
             / public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month), 1)
      ELSE 0
    END AS capacity_pct,
    -- C1: revenue is visible to admins only; NULL for club managers
    CASE WHEN v_is_admin THEN COALESCE(ba.revenue_cents, 0) ELSE NULL END AS revenue_cents
  FROM authorized_courts ac
  JOIN public.courts c    ON c.id = ac.id
  JOIN public.locations l ON l.id = c.location_id
  LEFT JOIN booking_agg ba ON ba.c_id = c.id
  ORDER BY l.name, c.name;
END;
$$;

-- ------------------------------------------------------------
-- Per-court monthly trend. H2: bound p_months. H3: GREATEST.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_court_utilization_trend(
  p_court_id uuid,
  p_months   int DEFAULT 6,
  p_sport    text DEFAULT NULL
)
RETURNS TABLE(
  month_start      date,
  possible_minutes integer,
  booked_minutes   integer,
  capacity_pct     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_email      text := auth.jwt() ->> 'email';
  v_is_admin   boolean;
  v_authorized boolean;
  v_tz         text;
  v_oh         jsonb;
  v_24         boolean;
  v_cur_month  date := date_trunc('month', now())::date;
  v_i          int;
  v_m          date;
  v_pm         integer;
  v_bm         integer;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  IF p_months IS NULL OR p_months < 1 OR p_months > 24 THEN
    RAISE EXCEPTION 'p_months must be between 1 and 24';
  END IF;

  IF p_sport IS NOT NULL AND p_sport NOT IN ('padel', 'tennis') THEN
    RAISE EXCEPTION 'p_sport must be padel or tennis';
  END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  IF v_is_admin THEN
    v_authorized := EXISTS (SELECT 1 FROM public.courts WHERE id = p_court_id);
  ELSE
    v_authorized :=
      EXISTS (
        SELECT 1 FROM public.club_court_assignments cca
        JOIN public.club_users cu ON cu.club_id = cca.club_id
        WHERE cca.court_id = p_court_id AND cu.user_id = v_uid AND cu.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM public.club_owner_assignments coa
        WHERE coa.court_id = p_court_id AND coa.user_id = v_uid
      );
  END IF;

  IF NOT v_authorized THEN RETURN; END IF;

  -- Sport-Filter: ein Court gehoert genau einer Sportart an. Passt sie nicht
  -- zum gewaehlten Scope, gibt es hier nichts anzuzeigen.
  IF p_sport IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.courts sc WHERE sc.id = p_court_id AND sc.sport = p_sport
  ) THEN
    RETURN;
  END IF;

  SELECT l.timezone, l.opening_hours_json, l.is_24_7
    INTO v_tz, v_oh, v_24
  FROM public.courts c
  JOIN public.locations l ON l.id = c.location_id
  WHERE c.id = p_court_id;

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_m := (v_cur_month - (v_i || ' months')::interval)::date;
    v_pm := public.location_open_minutes(v_oh, v_24, v_m);

    SELECT COALESCE(SUM(GREATEST(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60, 0)), 0)::int
      INTO v_bm
    FROM public.bookings b
    WHERE b.court_id = p_court_id
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE v_tz) >= v_m::timestamp
      AND (b.start_time AT TIME ZONE v_tz) <  (v_m + interval '1 month')::timestamp;

    month_start      := v_m;
    possible_minutes := v_pm;
    booked_minutes   := v_bm;
    capacity_pct     := CASE WHEN v_pm > 0 THEN round(100.0 * v_bm / v_pm, 1) ELSE 0 END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Network-wide monthly trend (admin only). H2: bound p_months. H3: GREATEST.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_network_utilization_trend(
  p_months int  DEFAULT 6,
  p_sport  text DEFAULT NULL
)
RETURNS TABLE(
  month_start      date,
  possible_minutes bigint,
  booked_minutes   bigint,
  capacity_pct     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text := auth.jwt() ->> 'email';
  v_is_admin  boolean;
  v_cur_month date := date_trunc('month', now())::date;
  v_i         int;
  v_m         date;
  v_pm        bigint;
  v_bm        bigint;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  IF p_months IS NULL OR p_months < 1 OR p_months > 24 THEN
    RAISE EXCEPTION 'p_months must be between 1 and 24';
  END IF;

  IF p_sport IS NOT NULL AND p_sport NOT IN ('padel', 'tennis') THEN
    RAISE EXCEPTION 'p_sport must be padel or tennis';
  END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  IF NOT v_is_admin THEN RETURN; END IF;

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_m := (v_cur_month - (v_i || ' months')::interval)::date;

    SELECT COALESCE(SUM(public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_m)), 0)
      INTO v_pm
    FROM public.courts c
    JOIN public.locations l ON l.id = c.location_id
    WHERE l.is_online = true
      AND (p_sport IS NULL OR c.sport = p_sport);

    SELECT COALESCE(SUM(GREATEST(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60, 0)), 0)::bigint
      INTO v_bm
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.locations l ON l.id = c.location_id
    WHERE l.is_online = true
      AND (p_sport IS NULL OR c.sport = p_sport)
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE l.timezone) >= v_m::timestamp
      AND (b.start_time AT TIME ZONE l.timezone) <  (v_m + interval '1 month')::timestamp;

    month_start      := v_m;
    possible_minutes := v_pm;
    booked_minutes   := v_bm;
    capacity_pct     := CASE WHEN v_pm > 0 THEN round(100.0 * v_bm / v_pm, 1) ELSE 0 END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- H1 / L4: least privilege — nach DROP + CREATE haengt am neuen Funktions-
-- objekt wieder der Postgres-Default-Grant fuer PUBLIC. Also erneut entziehen
-- und nur `authenticated` ausstatten (wie im Original).
-- location_open_minutes bleibt unveraendert und damit owner-only.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_court_utilization(date, text)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_court_utilization_trend(uuid, int, text)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_network_utilization_trend(int, text)       FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_court_utilization(date, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_court_utilization_trend(uuid, int, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_network_utilization_trend(int, text)       TO authenticated;
