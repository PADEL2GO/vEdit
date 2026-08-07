# App-Wiring-Handoff: Meine Buchungen · Punkte-Historie · Meine Events · Meine Bestellungen

Stand 2026-08-07, verifiziert gegen den Web-Code (padel2go-edit-main) und die Migrationen.
Gleiches Supabase-Projekt wie Web (`wvvdkuextsbsecqbfksb`), User-JWT + anon key — alle Reads
sind normale PostgREST-Selects unter RLS, alle Mutationen laufen über RPCs/Edge Functions.
Grundsetup (Client, Auth, PKCE) siehe `HANDOFF-ios-expo-app.md`.

---

## 1) Meine Buchungen

**Web-Referenz:** `src/components/booking/MyBookings.tsx` (~Z. 100) + `src/hooks/useCancelBooking.ts`

**Lesen (direkter Select, RLS: eigene Zeilen):**
```ts
supabase.from("bookings").select(`
  id, start_time, end_time, status, price_cents, currency,
  created_at, cancelled_at, hold_expires_at, location_id, court_id,
  location:locations(name, slug),
  court:courts(name)
`).eq("user_id", user.id).order("start_time", { ascending: false });
```
- `status`: `confirmed` / `cancelled` / `pending_payment` (bei `pending_payment` läuft ein
  Zahlungs-Hold — `hold_expires_at` beachten, danach ist die Buchung verfallen).
- Aufteilung „Kommend / Vergangen" im Web über `start_time` vs. jetzt; Stornierte gesondert.

**Stornieren — NIEMALS direktes UPDATE!** Die Client-UPDATE-Policy auf `bookings` wurde im
Security-Audit (Migration `20260731130000`) entfernt. Einziger Weg:
```ts
supabase.functions.invoke("cancel-booking", { body: { booking_id } });
```
Die Function prüft Berechtigung + Fristen und macht Refund/Storno serverseitig
(service-role, `cancel_confirmed_booking`-RPC). Fehlertexte kommen deutsch zurück.

---

## 2) Punkte-Historie

**Tabellen:** `wallets` (Kontostand) + `points_ledger` (Historie)

- **Kontostand:** `wallets.play_credits` ist DER eine P2G-Score (nach der
  Wallet-Konsolidierung; `reward_credits` ist überall 0). Web-Referenz:
  `src/hooks/useAccountData.ts` (~Z. 92).
- **Historie (RLS „Users can view own points ledger"):**
```ts
supabase.from("points_ledger")
  .select("id, delta_points, entry_type, credit_type, balance_after, description, created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(50); // paginieren
```
- `entry_type`: `EARN_CLAIM` (Payback/Reward) · `MARKETPLACE_REDEEM` (im Shop eingesetzt)
  · `REVERSAL` (Storno) · `ADMIN_ADJUST`. `credit_type`: `PLAY`/`REWARD` (Default REWARD).
- Anzeige-Muster wie im Admin (AdminUsers → Wallet-Tab): Delta mit Vorzeichen in Mono,
  danach „→ {balance_after} P." als neuer Saldo, `description` als Zeile darunter.
- **Kein Client-Write, nie.** Alle Wallet-Mutationen laufen über atomare
  service-role-RPCs (Projekt-Grundsatz). Die App liest nur.
- ⚠️ `credit_type` fehlt evtl. in generierten Types → Cast nötig
  (Web nutzt `(supabase as any)` für diese Tabelle).

---

## 3) Meine Events

**Web-Referenz:** `src/hooks/useEventRegistrations.ts` (kompletter Flow) ·
Migration `20260705170000_event_registrations.sql` (muss live gelaufen sein — verifizieren!)

- **Meine Anmeldungen (RLS „users view own registrations" scoped auf eigene Zeilen —
  der Web-Query filtert deshalb NICHT explizit auf user_id):**
```ts
supabase.from("event_registrations")
  .select("id, event_id, ticket_code, created_at, event:events(*)")
  .eq("status", "confirmed")
  .order("created_at", { ascending: false });
```
  `ticket_code` = Anzeige-/QR-Code fürs Ticket.
- **Anmelden (nur kostenlose Events — Phase 1; bezahlte Events haben `ticket_url` extern):**
```ts
const { data } = await supabase.rpc("register_for_event", { p_event_id: eventId });
// danach Bestätigungsmail anstoßen (fire-and-forget wie im Web):
supabase.functions.invoke("send-event-confirmation", { body: { registration_id: data.registration_id } });
```
  Die RPC prüft Kapazität/Duplikate serverseitig und gibt `registration_id` zurück.
- **Abmelden:** `supabase.rpc("cancel_event_registration", { p_event_id: eventId })`.

---

## 4) Meine Bestellungen

**Web-Referenz:** `src/hooks/useUserRedemptions.ts` + `src/components/account/AccountOrdersTab.tsx`

- **Bestell-Historie (RLS: eigene Zeilen):**
```ts
supabase.from("marketplace_redemptions")
  .select("*, item:marketplace_items(name, category, image_url)")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```
- Relevante Felder: `status` (`success` = bezahlt; `pending` = Hold offen, ggf.
  `hold_expires_at`), `fulfillment_status` (`pending`/`shipped`/`delivered`/`cancelled`),
  Versand: `tracking_number`, `carrier`, `shipped_at` (Migration `20260726164000`),
  Punkte-/Preisfelder je nach Kaufart.
- **Retoure anmelden (Client-Insert, RLS-geschützt — Muster AccountOrdersTab ~Z. 74):**
```ts
supabase.from("marketplace_returns").insert({ redemption_id, reason, ... }); // status startet als 'requested'
```
  Status-Kette: `requested` → `received` → `refunded` / `rejected` (Admin pflegt sie).
- **Kauf selbst** läuft NICHT über die App-Wiring hier — Checkout/Settlement sind eigene
  Edge Functions (Stripe-in-Browser + Poll, siehe Haupt-Handoff §Stripe). Diese Seite
  ist reine Historie + Retouren-Anfrage.

---

## Querschnitt

- **Types:** `event_registrations`, `marketplace_returns`, `points_ledger.credit_type`
  fehlen (Stand heute) in `types.ts` → im Web per `as any`-Cast gelöst; in der App eigene
  Interfaces definieren oder Types frisch generieren.
- **Formate:** de-DE überall (`toLocaleString("de-DE")`, €-Beträge aus Cents).
- **Realtime:** keiner der vier Screens nutzt Realtime im Web — Pull-to-Refresh reicht.
- **Fehlerbilder:** Edge Functions liefern deutsche `error`-Strings; RPC-Fehler
  (z. B. „Event ausgebucht") als Toast durchreichen.
