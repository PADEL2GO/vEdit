-- ============================================================================
-- Club-Portal: Kalender unterscheidet Mitglieder-Buchungen
-- ============================================================================
-- Bisher sah der Verein nur "Club-Buchung" oder "User-Buchung". Bucht ein
-- eigenes Vereinsmitglied, ist das aber weder das eine noch das andere — der
-- Club finanziert die Verguenstigung mit und muss sehen, WER gebucht hat und
-- WOMIT (Freikontingent oder Rabatt).
--
-- Warum eine RPC und kein direkter Select: club_users duerfen Buchungen ihrer
-- Courts lesen (RLS-Policy), aber NICHT die profiles anderer Nutzer. Der Name
-- muss deshalb ueber SECURITY DEFINER kommen — und wird nur fuer Buchungen von
-- Mitgliedern DIESES Vereins herausgegeben. Fremde Spieler bleiben anonym wie
-- bisher; ohne diese Grenze bekaeme jeder Club die Klarnamen der gesamten
-- Laufkundschaft auf seinem Platz.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.club_court_bookings(
  p_court_id uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
RETURNS TABLE (
  id                     uuid,
  start_time             timestamptz,
  end_time               timestamptz,
  status                 text,
  -- 'club'   = ueber das Club-Portal gebucht (Freikontingent des Vereins)
  -- 'member' = Vereinsmitglied hat selbst gebucht
  -- 'user'   = beliebiger Spieler
  category               text,
  -- Nur bei category = 'member' gesetzt.
  member_name            text,
  -- 'quota' | 'discount' | 'none', nur bei category = 'member'
  member_benefit         text,
  member_discount_cents  integer,
  allocation_minutes     integer,
  booked_for_member_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_club uuid;
BEGIN
  IF v_user IS NULL OR p_court_id IS NULL THEN
    RETURN;
  END IF;

  v_club := public.my_club_user_club_id();

  -- Zugriff nur, wenn der eigene Verein diesen Court zugewiesen hat.
  IF v_club IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.club_court_assignments cca
    WHERE cca.club_id = v_club AND cca.court_id = p_court_id
  ) THEN
    -- Alt-Bestand: club_owner ohne club_users-Zeile. Der sieht den Kalender
    -- weiterhin, hat aber keinen Verein — also auch keine Mitglieder-Namen.
    IF NOT EXISTS (
      SELECT 1 FROM public.club_owner_assignments coa
      WHERE coa.user_id = v_user AND coa.court_id = p_court_id
    ) THEN
      RETURN;
    END IF;
    v_club := NULL;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.start_time,
    b.end_time,
    b.status::text,
    CASE
      WHEN COALESCE(b.booking_origin, 'user') = 'club' THEN 'club'
      WHEN v_club IS NOT NULL AND b.member_club_id = v_club THEN 'member'
      ELSE 'user'
    END,
    CASE
      WHEN v_club IS NOT NULL AND b.member_club_id = v_club
           AND COALESCE(b.booking_origin, 'user') <> 'club'
      THEN COALESCE(p.display_name, p.username, split_part(u.email, '@', 1))
      ELSE NULL
    END,
    CASE
      WHEN v_club IS NULL OR b.member_club_id IS DISTINCT FROM v_club
           OR COALESCE(b.booking_origin, 'user') = 'club' THEN NULL
      WHEN COALESCE(b.is_free_allocation, false) THEN 'quota'
      WHEN COALESCE(b.member_discount_cents, 0) > 0 THEN 'discount'
      ELSE 'none'
    END,
    COALESCE(b.member_discount_cents, 0),
    b.allocation_minutes,
    b.booked_for_member_name
  FROM public.bookings b
  LEFT JOIN auth.users u ON u.id = b.user_id
  LEFT JOIN public.profiles p ON p.user_id = b.user_id
  WHERE b.court_id = p_court_id
    AND b.start_time >= p_from
    AND b.start_time <= p_to
    AND b.status NOT IN ('cancelled', 'expired')
  ORDER BY b.start_time;
END;
$$;

COMMENT ON FUNCTION public.club_court_bookings(uuid, timestamptz, timestamptz) IS
  'Kalenderdaten fuers Club-Portal. Klarnamen nur fuer Mitglieder des eigenen Vereins, fremde Spieler bleiben anonym.';

REVOKE ALL ON FUNCTION public.club_court_bookings(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_court_bookings(uuid, timestamptz, timestamptz) TO authenticated, service_role;
