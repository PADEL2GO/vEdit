-- ============================================================================
-- Vereinsmitglieder — Preislogik, Monatslimit, Freikontingent
-- ============================================================================
-- Design: docs/superpowers/specs/2026-08-14-vereinsmitglieder-design.md
--
--   Heim-Court   = Court, fuer den der Verein eine club_court_assignments-Zeile hat
--   Heim + Padel = vereinbarte Kondition (Abzug ODER Festpreis je Dauer)
--   Heim + Tennis= 0 EUR, unbegrenzt, zaehlt NICHT gegen das Monatslimit
--   Fremd+ Padel = Externenpreis minus fixem Abzug
--   Fremd+ Tennis= Externenpreis
--
-- resolve_booking_rate() bleibt die EINZIGE Stelle, die einen Preis kennt.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Neue Vereine bekommen automatisch Standard-Konditionen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_member_terms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_member_terms (club_id)
  VALUES (NEW.id)
  ON CONFLICT (club_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_member_terms_for_new_club ON public.clubs;
CREATE TRIGGER create_member_terms_for_new_club
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.create_default_member_terms();


-- ---------------------------------------------------------------------------
-- 2. resolve_member_pricing() — die Mitgliedsregel, an EINER Stelle
-- ---------------------------------------------------------------------------
-- Bekommt den bereits aufgeloesten Externenpreis und gibt zurueck, was das
-- Mitglied tatsaechlich zahlt. Ohne Mitgliedschaft: Externenpreis, Rabatt 0.
--
-- p_exclude_booking_id: beim Nachrechnen einer BESTEHENDEN Buchung muss diese
-- sich beim Monatslimit nicht selbst mitzaehlen — sonst faende der Checkout das
-- Limit erschoepft und wuerde den Preis nachtraeglich anheben.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_member_pricing(
  p_user_id            uuid,
  p_court_id           uuid,
  p_start              timestamptz,
  p_duration_minutes   integer,
  p_base_price_cents   integer,
  p_sport              text,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS TABLE (
  member_club_id         uuid,
  member_scope           text,
  member_price_cents     integer,
  member_discount_cents  integer,
  member_limit_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club      uuid;
  v_home      boolean;
  v_mode      text;
  v_home_disc integer;
  v_p60       integer;
  v_p90       integer;
  v_p120      integer;
  v_away_disc integer;
  v_limit     integer;
  v_price     integer;
  v_used      integer;
  v_remaining integer;
  v_month     date;
BEGIN
  IF p_user_id IS NULL OR p_court_id IS NULL OR p_base_price_cents IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, p_base_price_cents, 0, NULL::integer;
    RETURN;
  END IF;

  SELECT cm.club_id INTO v_club
  FROM public.club_memberships cm
  WHERE cm.user_id = p_user_id
    AND cm.is_active
    AND (cm.valid_until IS NULL OR cm.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date);

  IF v_club IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, p_base_price_cents, 0, NULL::integer;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.club_court_assignments cca
    WHERE cca.club_id = v_club AND cca.court_id = p_court_id
  ) INTO v_home;

  -- LEFT JOIN: fehlt die Konditionszeile, gelten die Spalten-Defaults.
  SELECT COALESCE(t.home_mode, 'discount'),
         COALESCE(t.home_discount_cents, 0),
         t.home_price_60_cents,
         t.home_price_90_cents,
         t.home_price_120_cents,
         COALESCE(t.away_discount_cents, 0),
         t.monthly_discount_limit
    INTO v_mode, v_home_disc, v_p60, v_p90, v_p120, v_away_disc, v_limit
  FROM (SELECT 1) AS one
  LEFT JOIN public.club_member_terms t ON t.club_id = v_club;

  -- Tennis: im eigenen Verein kostenlos und unbegrenzt, sonst Externenpreis.
  IF COALESCE(p_sport, 'padel') = 'tennis' THEN
    IF v_home THEN
      RETURN QUERY SELECT v_club, 'home'::text, 0, GREATEST(p_base_price_cents, 0), NULL::integer;
    ELSE
      RETURN QUERY SELECT v_club, 'away'::text, p_base_price_cents, 0, NULL::integer;
    END IF;
    RETURN;
  END IF;

  IF v_home THEN
    IF v_mode = 'fixed' THEN
      v_price := CASE p_duration_minutes
                   WHEN 60  THEN v_p60
                   WHEN 90  THEN v_p90
                   WHEN 120 THEN v_p120
                   ELSE NULL
                 END;
      -- Kein Festpreis fuer diese Dauer hinterlegt -> Externenpreis, kein stiller Rabatt.
      IF v_price IS NULL THEN
        v_price := p_base_price_cents;
      END IF;
    ELSE
      v_price := p_base_price_cents - v_home_disc;
    END IF;
  ELSE
    v_price := p_base_price_cents - v_away_disc;
  END IF;

  IF v_price < 0 THEN
    v_price := 0;
  END IF;
  -- Stripe rechnet unter 50 Cent nicht ab. Einen Restbetrag in diesem Band
  -- machen wir frei, statt den Mitgliederpreis wieder anzuheben.
  IF v_price > 0 AND v_price < 50 THEN
    v_price := 0;
  END IF;
  -- Eine Kondition darf niemals teurer als der Externenpreis werden.
  IF v_price > p_base_price_cents THEN
    v_price := p_base_price_cents;
  END IF;

  -- Monatslimit: zaehlt nur verguenstigte PADEL-Buchungen des Termin-Monats.
  -- Stornierte und abgelaufene Buchungen zaehlen nicht mit -> Storno gibt frei.
  IF v_limit IS NOT NULL AND v_price < p_base_price_cents THEN
    v_month := date_trunc('month', (p_start AT TIME ZONE 'Europe/Berlin'))::date;

    SELECT count(*) INTO v_used
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    WHERE b.user_id = p_user_id
      AND b.member_discount_cents > 0
      AND COALESCE(c.sport, 'padel') = 'padel'
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND (
        b.status = 'confirmed'
        OR (b.status = 'pending_payment' AND b.hold_expires_at > now())
      )
      AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month;

    v_remaining := GREATEST(v_limit - v_used, 0);

    IF v_remaining <= 0 THEN
      v_price := p_base_price_cents;
    END IF;
  ELSE
    v_remaining := v_limit;
  END IF;

  RETURN QUERY SELECT
    v_club,
    CASE WHEN v_home THEN 'home' ELSE 'away' END,
    v_price,
    p_base_price_cents - v_price,
    v_remaining;
END;
$$;

COMMENT ON FUNCTION public.resolve_member_pricing(uuid, uuid, timestamptz, integer, integer, text, uuid) IS
  'Mitglieder-Kondition fuer genau einen Slot. Einzige Stelle mit der Heim/Fremd- und Limit-Regel.';

-- Interne Regel: kein direkter Client-Zugriff (sonst liesse sich ein fremdes
-- p_user_id anfragen und die Vereinszugehoerigkeit anderer Nutzer auslesen).
REVOKE ALL ON FUNCTION public.resolve_member_pricing(uuid, uuid, timestamptz, integer, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_member_pricing(uuid, uuid, timestamptz, integer, integer, text, uuid)
  TO service_role;


-- ---------------------------------------------------------------------------
-- 3. resolve_booking_rate() — jetzt mitgliedsfaehig
-- ---------------------------------------------------------------------------
-- Signatur UND Rueckgabetyp aendern sich, deshalb DROP + CREATE. Bestehende
-- 3-Argument-Aufrufe in den Edge Functions laufen ueber die Defaults weiter.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resolve_booking_rates_batch(uuid, timestamptz[], integer);
DROP FUNCTION IF EXISTS public.resolve_booking_rate(uuid, timestamptz, integer);

CREATE FUNCTION public.resolve_booking_rate(
  p_court_id           uuid,
  p_start              timestamptz,
  p_duration_minutes   integer,
  p_user_id            uuid DEFAULT NULL,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS TABLE (
  price_cents            integer,
  points_multiplier      numeric,
  price_band_id          uuid,
  price_band_name        text,
  points_band_id         uuid,
  points_band_name       text,
  court_sport            text,
  base_price_cents       integer,
  member_club_id         uuid,
  member_scope           text,
  member_discount_cents  integer,
  member_limit_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local    timestamp;
  v_dow      smallint;
  v_minute   smallint;
  v_sport    text;
  v_band     record;
  v_price    integer := NULL;
  v_price_id uuid    := NULL;
  v_price_nm text    := NULL;
  v_mult     numeric := NULL;
  v_mult_id  uuid    := NULL;
  v_mult_nm  text    := NULL;
  v_user     uuid;
  v_role     text;
  v_member   record;
BEGIN
  IF p_court_id IS NULL OR p_start IS NULL OR p_duration_minutes IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text,
                        NULL::text, NULL::integer, NULL::uuid, NULL::text, 0, NULL::integer;
    RETURN;
  END IF;

  SELECT c.sport INTO v_sport FROM public.courts c WHERE c.id = p_court_id;
  IF v_sport IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text,
                        NULL::text, NULL::integer, NULL::uuid, NULL::text, 0, NULL::integer;
    RETURN;
  END IF;

  -- Tennis nur 60 Minuten: KEIN Preis statt stillem Rueckfall auf court_prices.
  IF v_sport = 'tennis' AND p_duration_minutes <> 60 THEN
    RETURN QUERY SELECT NULL::integer, 1.0::numeric, NULL::uuid, NULL::text, NULL::uuid, NULL::text,
                        v_sport, NULL::integer, NULL::uuid, NULL::text, 0, NULL::integer;
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

  -- Wessen Preis? Standard ist der aufrufende Nutzer. Ein explizit uebergebenes
  -- p_user_id akzeptieren wir nur von der Service-Rolle (Edge Functions) —
  -- sonst koennte ein Client die Vereinszugehoerigkeit anderer Nutzer abfragen.
  v_user := auth.uid();
  v_role := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  IF p_user_id IS NOT NULL AND (v_role IS NULL OR v_role = 'service_role') THEN
    v_user := p_user_id;
  END IF;

  SELECT * INTO v_member
  FROM public.resolve_member_pricing(
    v_user, p_court_id, p_start, p_duration_minutes, v_price, v_sport, p_exclude_booking_id
  );

  RETURN QUERY SELECT
    COALESCE(v_member.member_price_cents, v_price),
    COALESCE(v_mult, 1.0)::numeric,
    v_price_id, v_price_nm,
    v_mult_id,  v_mult_nm,
    v_sport,
    v_price,
    v_member.member_club_id,
    v_member.member_scope,
    COALESCE(v_member.member_discount_cents, 0),
    v_member.member_limit_remaining;
END;
$$;

COMMENT ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer, uuid, uuid) IS
  'Einzige Quelle fuer Buchungspreis, Punkte-Multiplikator und Mitglieder-Kondition. price_cents ist der zu zahlende Preis, base_price_cents der Externenpreis.';


CREATE FUNCTION public.resolve_booking_rates_batch(
  p_court_id         uuid,
  p_starts           timestamptz[],
  p_duration_minutes integer,
  p_user_id          uuid DEFAULT NULL
)
RETURNS TABLE (
  start_time             timestamptz,
  price_cents            integer,
  points_multiplier      numeric,
  price_band_name        text,
  points_band_name       text,
  base_price_cents       integer,
  member_scope           text,
  member_discount_cents  integer,
  member_limit_remaining integer
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
         r.base_price_cents,
         r.member_scope,
         r.member_discount_cents,
         r.member_limit_remaining
  FROM unnest(p_starts) AS s(start_time)
  CROSS JOIN LATERAL public.resolve_booking_rate(
    p_court_id, s.start_time, p_duration_minutes, p_user_id
  ) AS r;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_booking_rate(uuid, timestamptz, integer, uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_booking_rates_batch(uuid, timestamptz[], integer, uuid)
  TO anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. apply_member_pricing() — Preishoheit liegt in der Datenbank
-- ---------------------------------------------------------------------------
-- Der Client schickt price_cents mit; verbindlich ist ausschliesslich das, was
-- dieser Trigger stempelt. Der Advisory-Lock serialisiert gleichzeitige
-- Buchungen desselben Nutzers, damit zwei davon das Monatslimit nicht gemeinsam
-- ueberziehen koennen.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_member_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dur  integer;
  v_rate record;
  v_mem  record;
BEGIN
  -- Club-Portal-Buchungen, Kontingent-Buchungen und Gaeste bleiben unberuehrt.
  IF NEW.user_id IS NULL
     OR COALESCE(NEW.booking_origin, 'user') <> 'user'
     OR COALESCE(NEW.is_free_allocation, false)
  THEN
    RETURN NEW;
  END IF;

  v_dur := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60.0);

  PERFORM pg_advisory_xact_lock(hashtext('club_member_limit'), hashtext(NEW.user_id::text));

  -- Ohne p_user_id: liefert den reinen Externenpreis in base_price_cents.
  SELECT * INTO v_rate
  FROM public.resolve_booking_rate(NEW.court_id, NEW.start_time, v_dur);

  IF v_rate.base_price_cents IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_mem
  FROM public.resolve_member_pricing(
    NEW.user_id, NEW.court_id, NEW.start_time, v_dur,
    v_rate.base_price_cents, v_rate.court_sport, NULL
  );

  NEW.price_cents           := v_mem.member_price_cents;
  NEW.member_club_id        := v_mem.member_club_id;
  NEW.member_scope          := v_mem.member_scope;
  NEW.member_discount_cents := COALESCE(v_mem.member_discount_cents, 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_member_pricing_on_booking ON public.bookings;
CREATE TRIGGER apply_member_pricing_on_booking
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.apply_member_pricing();


-- ---------------------------------------------------------------------------
-- 5. claim_member_quota() — Mitglied bucht gegen das Vereins-Freikontingent
-- ---------------------------------------------------------------------------
-- Prueft unter Row-Lock BEIDE Deckel: den Vereinsrest fuer diesen Court und den
-- Pro-Kopf-Rest ueber alle Courts des Vereins. Schreibt denselben Ledger, den
-- der Club-Manager im Portal sieht.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_member_quota(p_booking_id uuid)
RETURNS TABLE (
  club_remaining   integer,
  member_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b          record;
  v_club     uuid;
  v_sport    text;
  v_dur      integer;
  v_month    date;
  v_allow    integer;
  v_enabled  boolean;
  v_cap      integer;
  v_club_rem integer;
  v_mem_rem  integer;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF b.user_id IS NULL OR b.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_your_booking';
  END IF;
  IF b.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'booking_not_pending';
  END IF;
  IF COALESCE(b.is_free_allocation, false) THEN
    RAISE EXCEPTION 'quota_already_used';
  END IF;

  SELECT cm.club_id INTO v_club
  FROM public.club_memberships cm
  WHERE cm.user_id = b.user_id
    AND cm.is_active
    AND (cm.valid_until IS NULL OR cm.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date);
  IF v_club IS NULL THEN
    RAISE EXCEPTION 'not_a_club_member';
  END IF;

  SELECT COALESCE(c.sport, 'padel') INTO v_sport FROM public.courts c WHERE c.id = b.court_id;
  IF v_sport = 'tennis' THEN
    -- Heim-Tennis ist ohnehin kostenlos; Kontingent dafuer zu verbrauchen waere doppelt.
    RAISE EXCEPTION 'tennis_already_free';
  END IF;

  SELECT cca.monthly_free_minutes INTO v_allow
  FROM public.club_court_assignments cca
  WHERE cca.club_id = v_club AND cca.court_id = b.court_id;
  IF v_allow IS NULL THEN
    RAISE EXCEPTION 'not_home_court';
  END IF;

  SELECT COALESCE(t.quota_enabled, false), COALESCE(t.quota_minutes_per_member, 0)
    INTO v_enabled, v_cap
  FROM (SELECT 1) AS one
  LEFT JOIN public.club_member_terms t ON t.club_id = v_club;

  IF NOT v_enabled OR v_cap <= 0 THEN
    RAISE EXCEPTION 'quota_not_enabled';
  END IF;

  v_dur   := ROUND(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60.0);
  v_month := date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date;

  -- Vereinsrest fuer DIESEN Court
  SELECT v_allow - COALESCE(SUM(l.minutes_used), 0) + COALESCE(SUM(l.minutes_refunded), 0)
    INTO v_club_rem
  FROM public.club_quota_ledger l
  WHERE l.club_id = v_club
    AND l.court_id = b.court_id
    AND l.month_start_date = v_month;

  -- Pro-Kopf-Rest ueber ALLE Courts des Vereins
  SELECT v_cap - COALESCE(SUM(l.minutes_used), 0) + COALESCE(SUM(l.minutes_refunded), 0)
    INTO v_mem_rem
  FROM public.club_quota_ledger l
  WHERE l.club_id = v_club
    AND l.member_user_id = b.user_id
    AND l.month_start_date = v_month;

  IF v_club_rem < v_dur THEN
    RAISE EXCEPTION 'club_quota_exhausted';
  END IF;
  IF v_mem_rem < v_dur THEN
    RAISE EXCEPTION 'member_quota_exhausted';
  END IF;

  INSERT INTO public.club_quota_ledger (
    club_id, club_owner_id, member_user_id, court_id, month_start_date,
    minutes_used, minutes_refunded, booking_id
  ) VALUES (
    v_club, NULL, b.user_id, b.court_id, v_month,
    v_dur, 0, b.id
  );

  UPDATE public.bookings
  SET price_cents           = 0,
      is_free_allocation    = true,
      allocation_minutes    = v_dur,
      club_id               = v_club,
      member_club_id        = v_club,
      member_scope          = 'home',
      -- Kontingent-Buchungen haben ihren eigenen Deckel und zaehlen deshalb
      -- nicht gegen das Monatslimit der Verguenstigungen.
      member_discount_cents = 0
  WHERE id = b.id;

  RETURN QUERY SELECT v_club_rem - v_dur, v_mem_rem - v_dur;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_member_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_member_quota(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 6. member_quota_summary() — was das Mitglied im Checkout sieht
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.member_quota_summary(
  p_court_id uuid,
  p_start    timestamptz
)
RETURNS TABLE (
  club_id          uuid,
  club_name        text,
  quota_enabled    boolean,
  club_remaining   integer,
  member_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_club  uuid;
  v_name  text;
  v_allow integer;
  v_en    boolean;
  v_cap   integer;
  v_month date;
  v_cr    integer;
  v_mr    integer;
BEGIN
  IF v_user IS NULL OR p_court_id IS NULL OR p_start IS NULL THEN
    RETURN;
  END IF;

  SELECT cm.club_id, c.name INTO v_club, v_name
  FROM public.club_memberships cm
  JOIN public.clubs c ON c.id = cm.club_id
  WHERE cm.user_id = v_user
    AND cm.is_active
    AND (cm.valid_until IS NULL OR cm.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date);
  IF v_club IS NULL THEN
    RETURN;
  END IF;

  SELECT cca.monthly_free_minutes INTO v_allow
  FROM public.club_court_assignments cca
  WHERE cca.club_id = v_club AND cca.court_id = p_court_id;

  SELECT COALESCE(t.quota_enabled, false), COALESCE(t.quota_minutes_per_member, 0)
    INTO v_en, v_cap
  FROM (SELECT 1) AS one
  LEFT JOIN public.club_member_terms t ON t.club_id = v_club;

  IF v_allow IS NULL OR NOT v_en OR v_cap <= 0 THEN
    RETURN QUERY SELECT v_club, v_name, false, 0, 0;
    RETURN;
  END IF;

  v_month := date_trunc('month', (p_start AT TIME ZONE 'Europe/Berlin'))::date;

  SELECT v_allow - COALESCE(SUM(l.minutes_used), 0) + COALESCE(SUM(l.minutes_refunded), 0)
    INTO v_cr
  FROM public.club_quota_ledger l
  WHERE l.club_id = v_club AND l.court_id = p_court_id AND l.month_start_date = v_month;

  SELECT v_cap - COALESCE(SUM(l.minutes_used), 0) + COALESCE(SUM(l.minutes_refunded), 0)
    INTO v_mr
  FROM public.club_quota_ledger l
  WHERE l.club_id = v_club AND l.member_user_id = v_user AND l.month_start_date = v_month;

  RETURN QUERY SELECT v_club, v_name, true, GREATEST(v_cr, 0), GREATEST(v_mr, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_quota_summary(uuid, timestamptz) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 7. refund_member_quota() — Minuten zurueck bei Storno und Ablauf
-- ---------------------------------------------------------------------------
-- Idempotent: eine bereits gutgeschriebene Buchung wird nicht zweimal erstattet.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_member_quota(p_booking_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry record;
BEGIN
  SELECT l.* INTO v_entry
  FROM public.club_quota_ledger l
  WHERE l.booking_id = p_booking_id
    AND l.member_user_id IS NOT NULL
    AND l.minutes_used > 0
  ORDER BY l.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.club_quota_ledger l
    WHERE l.booking_id = p_booking_id AND l.minutes_refunded > 0
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.club_quota_ledger (
    club_id, club_owner_id, member_user_id, court_id, month_start_date,
    minutes_used, minutes_refunded, booking_id
  ) VALUES (
    v_entry.club_id, NULL, v_entry.member_user_id, v_entry.court_id, v_entry.month_start_date,
    0, v_entry.minutes_used, p_booking_id
  );

  RETURN v_entry.minutes_used;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_member_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_member_quota(uuid) TO service_role;


-- Abgelaufene Reservierungen geben das Kontingent wieder frei. Der pg_cron-Job
-- ruft cleanup_expired_bookings bereits namentlich auf — nur der Rumpf waechst.
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cleanup$
DECLARE
  affected_rows integer := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.bookings
    WHERE status = 'pending_payment'
      AND hold_expires_at IS NOT NULL
      AND now() > hold_expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_booking_reserves(rec.id);
    PERFORM public.refund_member_quota(rec.id);

    UPDATE public.bookings
    SET status       = 'cancelled',
        cancelled_at = now()
    WHERE id = rec.id;

    affected_rows := affected_rows + 1;
  END LOOP;

  RETURN affected_rows;
END;
$cleanup$;


-- ---------------------------------------------------------------------------
-- 8. claim_club_member_invites() — Einladung beim Login einloesen
-- ---------------------------------------------------------------------------
-- Eine Mitgliedschaft ist bares Geld wert, deshalb nur mit bestaetigter
-- E-Mail-Adresse — sonst liesse sie sich ueber eine fremde Adresse erschleichen.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_club_member_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_invite    record;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(u.email), u.email_confirmed_at
    INTO v_email, v_confirmed
  FROM auth.users u
  WHERE u.id = v_user;

  IF v_email IS NULL OR v_confirmed IS NULL THEN
    RETURN 0;
  END IF;

  -- Genau ein Verein pro Nutzer: eine bestehende Mitgliedschaft gewinnt.
  IF EXISTS (SELECT 1 FROM public.club_memberships WHERE user_id = v_user) THEN
    RETURN 0;
  END IF;

  SELECT i.* INTO v_invite
  FROM public.club_member_invites i
  WHERE i.email = v_email AND i.status = 'pending'
  ORDER BY i.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.club_memberships (user_id, club_id, source, created_by)
  VALUES (v_user, v_invite.club_id, 'invite', v_invite.invited_by);

  UPDATE public.club_member_invites
  SET status = 'accepted', accepted_user_id = v_user, accepted_at = now()
  WHERE id = v_invite.id;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, cta_url)
  SELECT v_user, 'system', 'Vereinsmitgliedschaft aktiv',
         'Du bist jetzt als Mitglied von ' || c.name || ' hinterlegt und buchst zu Mitgliederkonditionen.',
         'club', c.id, '/booking'
  FROM public.clubs c
  WHERE c.id = v_invite.club_id;

  RETURN 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_club_member_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_club_member_invites() TO authenticated, service_role;
