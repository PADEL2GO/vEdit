-- Sicherheitsaudit 2026-07-31 — DB/RLS-Fixes.
-- Bericht: docs/SECURITY-AUDIT-2026-07.md · Log: docs/SECURITY-FIXES.md
--
-- Kontext: Alle betroffenen Schreibpfade (User-Stornierung, Freundschaft
-- annehmen/ablehnen, Lobby-Beitritt/-Zahlung) laufen bereits über service-role
-- Edge Functions bzw. RPCs, die RLS umgehen. Die hier entfernten Client-UPDATE-
-- Policies waren daher für legitime Funktionalität nicht nötig, öffneten aber
-- einen direkten PostgREST-Schreibpfad, der Preis-/Status-/Consent-Spalten
-- ungeprüft ließ. (Verifiziert: kein Client-Code nutzt diese UPDATE-Pfade.)

-- ── Fund 1 (Kritisch): bookings — Gratis-Buchungen via direktem UPDATE ────────
-- Ohne WITH CHECK konnte ein Nutzer die eigene Buchung auf status=confirmed,
-- price_cents=0 setzen und den kompletten Stripe-/Settlement-Stack umgehen.
-- User-Stornierung läuft über die cancel-booking Edge Function (service-role,
-- cancel_confirmed_booking RPC); Admin-Updates über "Admins can update all
-- bookings". Diese Policy wird daher ersatzlos entfernt.
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- ── Fund 5 (Hoch): lobby_members — Gratis bezahlpflichtige Lobby-Plätze ───────
-- Ohne WITH CHECK konnte ein Mitglied status='paid' selbst setzen. Statuswechsel
-- laufen über die lobby-api Edge Function (service-role).
DROP POLICY IF EXISTS "Users can update own membership" ON public.lobby_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.lobby_members;

-- ── Fund 7 (Hoch): friendships — Freundschaft fälschen / Consent-Bypass ───────
-- Ohne WITH CHECK konnte der Requester die eigene Anfrage selbst auf 'accepted'
-- setzen (→ umgeht "nur Freunde"-Gates für DMs/Lobby-Invites), der Addressee
-- konnte requester_id umbiegen. Annehmen/Ablehnen läuft über die friends-api
-- Edge Function (service-role).
DROP POLICY IF EXISTS "Addressee can respond" ON public.friendships;
DROP POLICY IF EXISTS "Requester can update own requests" ON public.friendships;

-- ── Fund 18 (Mittel): match_suggestions — Fälschung von matched_user_id/score ─
DROP POLICY IF EXISTS "Users can update their own match suggestions" ON public.match_suggestions;

-- ── Fund 4 (Hoch): receipt_counters — RLS war nie aktiviert ───────────────────
-- Ohne RLS galten die Default-Grants: jeder eingeloggte Client konnte die
-- GoBD-pflichtige Belegnummerierung ändern/löschen (Manipulation + Settlement-
-- DoS). Tabelle wird ausschließlich intern von create_receipt() (SECURITY
-- DEFINER) beschrieben → RLS aktivieren, keine Client-Policy.
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

-- ── Fund 6 (Hoch): get_user_rewards_balance() — fremder Punktestand ───────────
-- SECURITY DEFINER ohne REVOKE → per PostgREST /rpc auch unauthentifiziert für
-- jede User-UUID aufrufbar, hebelt die points_ledger-RLS aus. Funktion wird in
-- keiner RLS-Policy verwendet → EXECUTE entziehen (nur service-role behält es).
REVOKE ALL ON FUNCTION public.get_user_rewards_balance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_rewards_balance(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_rewards_balance(uuid) FROM authenticated;

-- HINWEIS zu Fund 13 (Mittel, RLS-Hilfsfunktionen has_role/are_friends/
-- is_lobby_member/... Enumeration): NICHT hier enthalten. Diese Funktionen
-- werden in 39 RLS-Policies aufgerufen; ein EXECUTE-Entzug von 'authenticated'
-- kann die Policy-Auswertung brechen und muss zuerst in Staging getestet werden.
-- Siehe docs/SECURITY-FIXES.md → offen.
