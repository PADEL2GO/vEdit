-- ============================================================================
-- Vereinsmitglieder — Verwaltung durch den Verein selbst
-- ============================================================================
-- Design: docs/superpowers/specs/2026-08-14-vereinsmitglieder-design.md
--
-- Bewusst als SECURITY DEFINER RPCs und nicht als Edge Function: die
-- E-Mail-Suche in auth.users ist der einzige Grund, warum es sonst den
-- Service-Key braeuchte — in der Datenbank ist sie ohne Umweg moeglich.
--
-- Eine Tabelle, zwei Zugaenge: was der Admin vergibt, sieht der Verein sofort
-- und umgekehrt.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Zugriffspruefung: Manager (schreiben) bzw. Club-Nutzer (lesen)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_club_manager(p_user_id uuid, p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_users cu
    WHERE cu.user_id = p_user_id
      AND cu.club_id = p_club_id
      AND cu.is_active
      AND cu.role_in_club = 'manager'
  ) OR public.has_role(p_user_id, 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_club_staff(p_user_id uuid, p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_users cu
    WHERE cu.user_id = p_user_id
      AND cu.club_id = p_club_id
      AND cu.is_active
  ) OR public.has_role(p_user_id, 'admin'::app_role);
$$;

GRANT EXECUTE ON FUNCTION public.is_club_manager(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_club_staff(uuid, uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 1. invite_club_members() — mehrere Adressen auf einmal
-- ---------------------------------------------------------------------------
-- Existiert zur Adresse ein Konto, ist die Mitgliedschaft sofort aktiv.
-- Sonst wird eine Einladung hinterlegt, die beim naechsten Login dieses Kontos
-- automatisch greift (claim_club_member_invites).
--
-- Rueckgabe je Adresse: added | invited | already_member | other_club |
--                       already_invited | invalid
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_club_members(
  p_club_id uuid,
  p_emails  text[]
)
RETURNS TABLE (
  email  text,
  result text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  uuid := auth.uid();
  v_raw    text;
  v_email  text;
  v_user   uuid;
  v_club   uuid;
  v_name   text;
BEGIN
  IF NOT public.is_club_manager(v_actor, p_club_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT c.name INTO v_name FROM public.clubs c WHERE c.id = p_club_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'club_not_found';
  END IF;

  FOREACH v_raw IN ARRAY p_emails LOOP
    v_email := lower(btrim(v_raw));
    CONTINUE WHEN v_email = '';

    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      email := v_email; result := 'invalid'; RETURN NEXT; CONTINUE;
    END IF;

    SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = v_email LIMIT 1;

    IF v_user IS NULL THEN
      -- Kein Konto: Einladung hinterlegen, greift beim naechsten Login.
      IF EXISTS (
        SELECT 1 FROM public.club_member_invites i
        WHERE i.email = v_email AND i.status = 'pending'
      ) THEN
        email := v_email; result := 'already_invited'; RETURN NEXT; CONTINUE;
      END IF;

      INSERT INTO public.club_member_invites (club_id, email, invited_by)
      VALUES (p_club_id, v_email, v_actor);

      email := v_email; result := 'invited'; RETURN NEXT; CONTINUE;
    END IF;

    SELECT cm.club_id INTO v_club
    FROM public.club_memberships cm WHERE cm.user_id = v_user;

    IF v_club = p_club_id THEN
      email := v_email; result := 'already_member'; RETURN NEXT; CONTINUE;
    ELSIF v_club IS NOT NULL THEN
      -- Genau ein Verein pro Nutzer: eine fremde Mitgliedschaft wird nicht ueberschrieben.
      email := v_email; result := 'other_club'; RETURN NEXT; CONTINUE;
    END IF;

    INSERT INTO public.club_memberships (user_id, club_id, source, created_by)
    VALUES (v_user, p_club_id, 'club', v_actor);

    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, cta_url)
    VALUES (v_user, 'system', 'Vereinsmitgliedschaft aktiv',
            'Du bist jetzt als Mitglied von ' || v_name || ' hinterlegt und buchst zu Mitgliederkonditionen.',
            'club', p_club_id, '/booking');

    email := v_email; result := 'added'; RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_club_members(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_club_members(uuid, text[]) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2. club_member_overview() — wer bucht wieviel?
-- ---------------------------------------------------------------------------
-- Gezaehlt werden ausschliesslich Buchungen, die als Mitglied DIESES Vereins
-- entstanden sind (bookings.member_club_id). Keine Zahlungsdaten, keine
-- Buchungen von Nichtmitgliedern.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_member_overview(p_club_id uuid)
RETURNS TABLE (
  membership_id           uuid,
  user_id                 uuid,
  display_name            text,
  email                   text,
  source                  text,
  valid_until             date,
  member_since            timestamptz,
  bookings_total          integer,
  bookings_month          integer,
  discount_bookings_month integer,
  discount_cents_month    integer,
  free_tennis_month       integer,
  quota_minutes_month     integer,
  last_booking_at         timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;
BEGIN
  IF NOT public.is_club_staff(auth.uid(), p_club_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    cm.id,
    cm.user_id,
    COALESCE(p.display_name, p.username, split_part(u.email, '@', 1)),
    u.email::text,
    cm.source,
    cm.valid_until,
    cm.created_at,
    COALESCE(s.bookings_total, 0)::integer,
    COALESCE(s.bookings_month, 0)::integer,
    COALESCE(s.discount_bookings_month, 0)::integer,
    COALESCE(s.discount_cents_month, 0)::integer,
    COALESCE(s.free_tennis_month, 0)::integer,
    COALESCE(q.minutes, 0)::integer,
    s.last_booking_at
  FROM public.club_memberships cm
  JOIN auth.users u ON u.id = cm.user_id
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (
        WHERE b.status IN ('confirmed', 'completed')
      ) AS bookings_total,
      count(*) FILTER (
        WHERE b.status IN ('confirmed', 'completed')
          AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month
      ) AS bookings_month,
      count(*) FILTER (
        WHERE b.member_discount_cents > 0
          AND COALESCE(c.sport, 'padel') = 'padel'
          AND b.status IN ('confirmed', 'completed')
          AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month
      ) AS discount_bookings_month,
      COALESCE(SUM(b.member_discount_cents) FILTER (
        WHERE COALESCE(c.sport, 'padel') = 'padel'
          AND b.status IN ('confirmed', 'completed')
          AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month
      ), 0) AS discount_cents_month,
      count(*) FILTER (
        WHERE COALESCE(c.sport, 'padel') = 'tennis'
          AND b.status IN ('confirmed', 'completed')
          AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month
      ) AS free_tennis_month,
      max(b.start_time) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS last_booking_at
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    WHERE b.user_id = cm.user_id
      AND b.member_club_id = p_club_id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(l.minutes_used), 0) - COALESCE(SUM(l.minutes_refunded), 0) AS minutes
    FROM public.club_quota_ledger l
    WHERE l.club_id = p_club_id
      AND l.member_user_id = cm.user_id
      AND l.month_start_date = v_month
  ) q ON true
  WHERE cm.club_id = p_club_id
  ORDER BY COALESCE(s.discount_bookings_month, 0) DESC, cm.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.club_member_overview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_member_overview(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. Mitgliedschaft beenden / Einladung zurueckziehen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_club_member(p_membership_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club uuid;
BEGIN
  SELECT cm.club_id INTO v_club
  FROM public.club_memberships cm WHERE cm.id = p_membership_id;

  IF v_club IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.is_club_manager(auth.uid(), v_club) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.club_memberships WHERE id = p_membership_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_club_member_invite(p_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club uuid;
BEGIN
  SELECT i.club_id INTO v_club
  FROM public.club_member_invites i WHERE i.id = p_invite_id AND i.status = 'pending';

  IF v_club IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.is_club_manager(auth.uid(), v_club) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.club_member_invites SET status = 'revoked' WHERE id = p_invite_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_club_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_club_member_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_club_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_club_member_invite(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. my_club_membership() — was das Mitglied selbst ueber sich sieht
-- ---------------------------------------------------------------------------
-- Eine Abfrage fuer die Buchungsstrecke: Verein, Konditionen im Klartext und
-- der Rest des Monatslimits.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_club_membership()
RETURNS TABLE (
  club_id                uuid,
  club_name              text,
  home_mode              text,
  home_discount_cents    integer,
  away_discount_cents    integer,
  monthly_discount_limit integer,
  discount_used_month    integer,
  quota_enabled          boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_month date := date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    COALESCE(t.home_mode, 'discount'),
    COALESCE(t.home_discount_cents, 0),
    COALESCE(t.away_discount_cents, 0),
    t.monthly_discount_limit,
    (
      SELECT count(*)::integer
      FROM public.bookings b
      JOIN public.courts ct ON ct.id = b.court_id
      WHERE b.user_id = v_user
        AND b.member_discount_cents > 0
        AND COALESCE(ct.sport, 'padel') = 'padel'
        AND (b.status = 'confirmed'
             OR (b.status = 'pending_payment' AND b.hold_expires_at > now()))
        AND date_trunc('month', (b.start_time AT TIME ZONE 'Europe/Berlin'))::date = v_month
    ),
    COALESCE(t.quota_enabled, false)
  FROM public.club_memberships cm
  JOIN public.clubs c ON c.id = cm.club_id
  LEFT JOIN public.club_member_terms t ON t.club_id = cm.club_id
  WHERE cm.user_id = v_user
    AND cm.is_active
    AND (cm.valid_until IS NULL OR cm.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date);
END;
$$;

REVOKE ALL ON FUNCTION public.my_club_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_club_membership() TO authenticated, service_role;
