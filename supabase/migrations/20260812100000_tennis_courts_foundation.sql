-- ============================================================================
-- Tennis als zweite Sportart — Fundament
-- ============================================================================
-- Plan: docs/superpowers/specs (Tennis-Courts als zweite Sportart)
--
-- Additiv nach bewaehrtem Muster: Bestands-Courts werden per DEFAULT automatisch
-- 'padel', es ist keine Datenmigration noetig und ohne Tennis-Court aendert sich
-- am Verhalten der Plattform nichts.
--
-- Kernpunkt: Ein GLOBALES Preisband (court_id IS NULL) wuerde nach Einfuehrung
-- von Tennis ungefiltert auch auf Tennis-Courts greifen. Das waere ein Preis-
-- fehler, kein Anzeigefehler. Deshalb bekommen Baender eine Sport-Dimension.
-- ============================================================================

-- 1. Sportart am Court -------------------------------------------------------
ALTER TABLE public.courts
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'padel';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courts_sport_valid'
  ) THEN
    ALTER TABLE public.courts
      ADD CONSTRAINT courts_sport_valid CHECK (sport IN ('padel', 'tennis'));
  END IF;
END $$;

COMMENT ON COLUMN public.courts.sport IS
  'Sportart des Platzes. Steuert Buchungsdauern, Payback (Tennis = keine Punkte) und Preisband-Zuordnung.';

CREATE INDEX IF NOT EXISTS courts_sport_idx ON public.courts (sport) WHERE is_active;


-- 2. Tennis-Bild je Standort -------------------------------------------------
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS tennis_image_url text;

COMMENT ON COLUMN public.locations.tennis_image_url IS
  'Eigene Tennis-Ansicht des Standorts. Courts teilen sich das Bild ihrer Sportart.';


-- 3. Sport-Dimension an den Preisbaendern -------------------------------------
-- NULL = gilt fuer alle Sportarten; sonst nur fuer die genannte.
-- Court-spezifische Baender sind ohnehin implizit sportkorrekt (der Court hat
-- genau eine Sportart) — entscheidend ist die Wirkung auf globale Baender.
ALTER TABLE public.court_pricing_bands
  ADD COLUMN IF NOT EXISTS sport text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'court_pricing_bands_sport_valid'
  ) THEN
    ALTER TABLE public.court_pricing_bands
      ADD CONSTRAINT court_pricing_bands_sport_valid
      CHECK (sport IS NULL OR sport IN ('padel', 'tennis'));
  END IF;
END $$;

COMMENT ON COLUMN public.court_pricing_bands.sport IS
  'Sportart-Einschraenkung. NULL = alle Sportarten. Verhindert, dass ein globales Band ungewollt auf Tennis greift.';


-- 4. Preis-/Punkte-Aufloesung sportbewusst ------------------------------------
-- Rueckgabetyp aendert sich (neue Spalte court_sport) -> DROP + CREATE noetig.
-- Reihenfolge beachten: der Batch-Wrapper haengt an resolve_booking_rate.
DROP FUNCTION IF EXISTS public.resolve_booking_rates_batch(uuid, timestamptz[], integer);
DROP FUNCTION IF EXISTS public.resolve_booking_rate(uuid, timestamptz, integer);

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
  v_sport := COALESCE(v_sport, 'padel');

  -- Feste Zeitzone: "6 Uhr" bleibt auch nach der Zeitumstellung 6 Uhr.
  v_local  := p_start AT TIME ZONE 'Europe/Berlin';
  v_dow    := EXTRACT(ISODOW FROM v_local)::smallint;
  v_minute := (EXTRACT(HOUR FROM v_local) * 60 + EXTRACT(MINUTE FROM v_local))::smallint;

  FOR v_band IN
    SELECT b.id, b.name, b.price_cents_60, b.price_cents_90, b.price_cents_120, b.points_multiplier
    FROM public.court_pricing_bands b
    WHERE b.is_active
      AND (b.court_id = p_court_id OR b.court_id IS NULL)
      AND (b.sport IS NULL OR b.sport = v_sport)
      AND v_dow = ANY (b.weekdays)
      AND v_minute >= b.start_minute
      AND v_minute <  b.end_minute
    ORDER BY (b.court_id IS NOT NULL) DESC, (b.sport IS NOT NULL) DESC,
             b.priority DESC, b.start_minute ASC, b.id ASC
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

  -- Kein Band-Preis -> heutiger Standardpreis
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

COMMENT ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer) IS
  'Einzige Quelle fuer Buchungspreis + Punkte-Multiplikator + Sportart. Baender gelten nur fuer passende Sportart.';


CREATE OR REPLACE FUNCTION public.resolve_booking_rates_batch(
  p_court_id         uuid,
  p_starts           timestamptz[],
  p_duration_minutes integer
)
RETURNS TABLE (
  start_time        timestamptz,
  price_cents       integer,
  points_multiplier numeric,
  price_band_name   text,
  points_band_name  text,
  court_sport       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.start_time,
         r.price_cents,
         r.points_multiplier,
         r.price_band_name,
         r.points_band_name,
         r.court_sport
  FROM unnest(p_starts) AS s(start_time)
  CROSS JOIN LATERAL public.resolve_booking_rate(p_court_id, s.start_time, p_duration_minutes) AS r;
$$;


-- court_min_price_cents: globale Baender duerfen nur zaehlen, wenn ihre
-- Sportart zum Court passt — sonst wuerde ein guenstiges Tennis-Band als
-- Padel-"ab X EUR" ausgewiesen.
CREATE OR REPLACE FUNCTION public.court_min_price_cents(p_court_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(price)::integer FROM (
    SELECT cp.price_cents AS price
    FROM public.court_prices cp
    WHERE cp.court_id = p_court_id
    UNION ALL
    SELECT unnest(ARRAY[b.price_cents_60, b.price_cents_90, b.price_cents_120]) AS price
    FROM public.court_pricing_bands b
    WHERE b.is_active
      AND (b.court_id = p_court_id OR b.court_id IS NULL)
      AND (
        b.sport IS NULL
        OR b.sport = COALESCE((SELECT c.sport FROM public.courts c WHERE c.id = p_court_id), 'padel')
      )
  ) prices
  WHERE price IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_booking_rates_batch(uuid, timestamptz[], integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.court_min_price_cents(uuid)
  TO anon, authenticated, service_role;


-- 5. Bild-Slot fuer den Tennis-Hinweis auf der Buchungsseite ------------------
INSERT INTO public.site_visuals (key, label, category, description)
VALUES (
  'booking.tennis.teaser',
  'Tennis-Hinweis (Buchungsseite)',
  'Buchung',
  'Stimmungsbild fuer den Tennis-Hinweis auf der Buchungsseite. Empfohlene Groesse: 1200x800.'
)
ON CONFLICT (key) DO NOTHING;
