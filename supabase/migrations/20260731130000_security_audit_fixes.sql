-- Sicherheitsaudit 2026-07-31 -- DB/RLS-Fixes.
-- Bericht: docs/SECURITY-AUDIT-2026-07.md  Log: docs/SECURITY-FIXES.md
--
-- Kontext: Alle betroffenen Schreibpfade (User-Stornierung, Freundschaft
-- annehmen/ablehnen, Lobby-Beitritt/-Zahlung) laufen bereits ueber service-role
-- Edge Functions bzw. RPCs, die RLS umgehen. Die hier entfernten Client-UPDATE-
-- Policies waren fuer legitime Funktionalitaet nicht noetig, oeffneten aber
-- einen direkten PostgREST-Schreibpfad, der Preis-/Status-/Consent-Spalten
-- ungeprueft liess. (Verifiziert: kein Client-Code nutzt diese UPDATE-Pfade.)

-- Fund 1 (Kritisch): bookings -- Gratis-Buchungen via direktem UPDATE.
-- Ohne WITH CHECK konnte ein Nutzer die eigene Buchung auf status=confirmed,
-- price_cents=0 setzen und den Stripe-/Settlement-Stack umgehen. User-Storno
-- laeuft ueber cancel-booking (service-role), Admin ueber eigene Policy.
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- Fund 5 (Hoch): lobby_members -- Gratis bezahlpflichtige Lobby-Plaetze.
-- Ohne WITH CHECK konnte ein Mitglied status='paid' selbst setzen.
DROP POLICY IF EXISTS "Users can update own membership" ON public.lobby_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.lobby_members;

-- Fund 7 (Hoch): friendships -- Freundschaft faelschen / Consent-Bypass.
-- Ohne WITH CHECK konnte der Requester die eigene Anfrage auf 'accepted' setzen.
DROP POLICY IF EXISTS "Addressee can respond" ON public.friendships;
DROP POLICY IF EXISTS "Requester can update own requests" ON public.friendships;

-- Fund 18 (Mittel): match_suggestions -- Faelschung von matched_user_id/score.
DROP POLICY IF EXISTS "Users can update their own match suggestions" ON public.match_suggestions;

-- Fund 4 (Hoch): receipt_counters -- RLS war nie aktiviert. Ohne RLS konnte
-- jeder eingeloggte Client die GoBD-pflichtige Belegnummerierung aendern/loeschen.
-- Nur intern via create_receipt() (SECURITY DEFINER) beschrieben -> RLS an,
-- keine Client-Policy. Guard: falls die Tabelle live noch nicht existiert.
DO $$
BEGIN
  IF to_regclass('public.receipt_counters') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Fund 6 (Hoch): get_user_rewards_balance() -- fremder Punktestand.
-- SECURITY DEFINER ohne REVOKE -> per PostgREST /rpc auch unauthentifiziert fuer
-- jede User-UUID aufrufbar, hebelt die points_ledger-RLS aus. In keiner RLS-
-- Policy verwendet -> EXECUTE entziehen. Guard: falls die Funktion live fehlt.
DO $$
BEGIN
  IF to_regprocedure('public.get_user_rewards_balance(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_user_rewards_balance(uuid) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- HINWEIS zu Fund 13 (Mittel, RLS-Hilfsfunktionen has_role/are_friends/
-- is_lobby_member/...): NICHT hier enthalten. In 39 RLS-Policies genutzt; ein
-- EXECUTE-Entzug von 'authenticated' kann die Policy-Auswertung brechen und
-- muss zuerst in Staging getestet werden. Siehe docs/SECURITY-FIXES.md.
