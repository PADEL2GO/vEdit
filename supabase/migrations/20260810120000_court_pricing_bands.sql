-- ============================================================================
-- Zeitfenster-Bänder für Court-Preise UND P2G-Payback-Punkte
-- ============================================================================
-- Design: docs/superpowers/specs/2026-08-10-preisbaender-launch-reset-design.md
--
-- Bänder sind eine OVERRIDE-SCHICHT über dem bestehenden Modell:
--   * greift kein Band  -> exakt der heutige court_prices-Preis / Punkte x1,0
--   * greift ein Band   -> dessen Preis bzw. Multiplikator gewinnt
-- Ohne angelegtes Band ändert sich das Verhalten der Plattform also nicht.
--
-- Preise (je Dauer) und points_multiplier sind EINZELN optional: ein Band kann
-- nur die Punkte anheben ("6-8 Uhr doppelte Punkte, Preis normal"), nur den
-- Preis ändern, oder beides.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.court_pricing_bands (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = globales Band (gilt für alle Courts); gesetzt = nur dieser Court
  court_id          uuid REFERENCES public.courts(id) ON DELETE CASCADE,
  name              text NOT NULL,
  -- ISO-Wochentage: 1=Montag .. 7=Sonntag
  weekdays          smallint[] NOT NULL,
  -- Minuten seit Mitternacht, Ende exklusiv: 06:00-09:00 = 360 bis 540
  start_minute      smallint NOT NULL,
  end_minute        smallint NOT NULL,
  -- Preis je Dauer; NULL = Standardpreis aus court_prices bleibt gültig
  price_cents_60    integer,
  price_cents_90    integer,
  price_cents_120   integer,
  -- Faktor auf den Basis-Payback; NULL = 1,0 (keine Änderung)
  points_multiplier numeric(4,2),
  -- Bei Überlappung gewinnt der höhere Wert
  priority          smallint NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT court_pricing_bands_name_not_blank
    CHECK (length(btrim(name)) > 0),
  -- Kein Band über Mitternacht: 22-02 Uhr wird als zwei Bänder angelegt.
  -- Hält die Auflösung frei von Sonderfällen.
  CONSTRAINT court_pricing_bands_time_range
    CHECK (start_minute >= 0 AND end_minute <= 1440 AND end_minute > start_minute),
  CONSTRAINT court_pricing_bands_weekdays_valid
    CHECK (
      weekdays IS NOT NULL
      AND array_length(weekdays, 1) BETWEEN 1 AND 7
      AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
    ),
  CONSTRAINT court_pricing_bands_prices_non_negative
    CHECK (
      (price_cents_60  IS NULL OR price_cents_60  >= 0) AND
      (price_cents_90  IS NULL OR price_cents_90  >= 0) AND
      (price_cents_120 IS NULL OR price_cents_120 >= 0)
    ),
  CONSTRAINT court_pricing_bands_multiplier_range
    CHECK (points_multiplier IS NULL OR (points_multiplier >= 0 AND points_multiplier <= 10))
);

COMMENT ON TABLE public.court_pricing_bands IS
  'Zeitfenster-Overrides für Court-Preise und P2G-Payback. Kein Treffer = court_prices/Faktor 1,0.';

CREATE INDEX IF NOT EXISTS court_pricing_bands_lookup_idx
  ON public.court_pricing_bands (court_id, start_minute)
  WHERE is_active;

ALTER TABLE public.court_pricing_bands ENABLE ROW LEVEL SECURITY;

-- Preise sind öffentlich (Buchungsseite zeigt sie auch Gästen)
DROP POLICY IF EXISTS "Anyone can view pricing bands" ON public.court_pricing_bands;
CREATE POLICY "Anyone can view pricing bands"
  ON public.court_pricing_bands FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage pricing bands" ON public.court_pricing_bands;
CREATE POLICY "Admins can manage pricing bands"
  ON public.court_pricing_bands FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_court_pricing_bands_updated_at ON public.court_pricing_bands;
CREATE TRIGGER update_court_pricing_bands_updated_at
  BEFORE UPDATE ON public.court_pricing_bands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- resolve_booking_rate() — DIE eine Wahrheit für Preis + Punkte-Faktor.
-- Jede Edge Function und das Frontend rufen ausschliesslich diese Funktion auf,
-- damit Vorschau, Checkout und Gutschrift niemals auseinanderlaufen können.
--
-- Auflösung (Startzeitpunkt der Buchung, Zeitzone Europe/Berlin):
--   1. Kandidaten = aktive Bänder, deren Wochentag + Zeitfenster passen und
--      die entweder für diesen Court oder global (court_id IS NULL) gelten
--   2. Reihenfolge: Court-Band vor globalem Band, dann priority DESC
--   3. Preis  = erster Kandidat mit gesetztem Preis für DIESE Dauer
--               sonst court_prices (heutiges Verhalten)
--   4. Faktor = erster Kandidat mit gesetztem points_multiplier, sonst 1,0
-- price_cents ist NULL, wenn weder Band noch court_prices etwas liefern —
-- der Aufrufer wirft dann wie bisher einen Fehler.
-- ============================================================================
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
  points_band_name  text
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
  v_band      record;
  v_price     integer := NULL;
  v_price_id  uuid    := NULL;
  v_price_nm  text    := NULL;
  v_mult      numeric := NULL;
  v_mult_id   uuid    := NULL;
  v_mult_nm   text    := NULL;
BEGIN
  IF p_court_id IS NULL OR p_start IS NULL OR p_duration_minutes IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Feste Zeitzone: "6 Uhr" bleibt auch nach der Zeitumstellung 6 Uhr.
  v_local  := p_start AT TIME ZONE 'Europe/Berlin';
  v_dow    := EXTRACT(ISODOW FROM v_local)::smallint;
  v_minute := (EXTRACT(HOUR FROM v_local) * 60 + EXTRACT(MINUTE FROM v_local))::smallint;

  FOR v_band IN
    SELECT b.id, b.name, b.price_cents_60, b.price_cents_90, b.price_cents_120, b.points_multiplier
    FROM public.court_pricing_bands b
    WHERE b.is_active
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
    v_mult_id,  v_mult_nm;
END;
$$;

COMMENT ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer) IS
  'Einzige Quelle für Buchungspreis + Punkte-Multiplikator. Band schlägt court_prices; ohne Band heutiges Verhalten.';


-- ============================================================================
-- resolve_booking_rates_batch() — dieselbe Logik für viele Startzeiten auf
-- einmal. Die Buchungsseite löst damit alle Slots eines Tages in EINEM Request
-- auf, statt die Bandlogik im Client nachzubauen (die dann auseinanderliefe).
-- ============================================================================
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
  points_band_name  text
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
         r.points_band_name
  FROM unnest(p_starts) AS s(start_time)
  CROSS JOIN LATERAL public.resolve_booking_rate(p_court_id, s.start_time, p_duration_minutes) AS r;
$$;


-- ============================================================================
-- court_min_price_cents() — günstigster Preis eines Courts über ALLE Dauern
-- und aktiven Bänder. Damit bleibt die "ab X €"-Anzeige ehrlich, wenn ein
-- Frühtarif günstiger als der Standardpreis ist.
-- ============================================================================
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
    WHERE b.is_active AND (b.court_id = p_court_id OR b.court_id IS NULL)
  ) prices
  WHERE price IS NOT NULL;
$$;


-- Lesende Funktionen: auch für Gäste (anon) nötig — die Buchungsseite ist öffentlich.
GRANT EXECUTE ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_booking_rates_batch(uuid, timestamptz[], integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.court_min_price_cents(uuid)
  TO anon, authenticated, service_role;
