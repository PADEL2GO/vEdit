# App-Handoff: Tennis-Courts — alle Backend-Änderungen

Stand 2026-08-12, verifiziert gegen die Live-Datenbank (`wvvdkuextsbsecqbfksb`) und den deployten Code.
Grundsetup (Client, Auth, PKCE) siehe `HANDOFF-ios-expo-app.md`; Buchungs-/Punkte-Screens siehe `HANDOFF-app-wiring-buchungen-punkte-events-bestellungen.md`.

---

## Kurzfassung für die App

Ein Court hat jetzt eine **Sportart**: `padel` oder `tennis`. Vier Dinge folgen daraus:

1. **Tennis-Buchungen geben KEINE P2G-Punkte.** Der Server erzwingt das — die App muss nur aufhören, Punkte zu versprechen.
2. **Tennis ist nur für 60 Minuten buchbar.** Ebenfalls serverseitig erzwungen, auch beim direkten Insert.
3. **Preise sind pro Court** wie bisher — aber Preisbänder gelten jetzt je Sportart. Die App muss nichts rechnen, nur die richtige RPC fragen.
4. **Padel bleibt im Vordergrund.** Tennis nur zeigen, wo ein Standort tatsächlich Tennis-Courts hat.

Ohne Tennis-Courts verhält sich alles exakt wie vorher — der Rollout ist gefahrlos.

---

## 1. Schema

| Tabelle | Spalte | Bedeutung |
|---|---|---|
| `courts` | `sport text NOT NULL DEFAULT 'padel'` | `'padel'` \| `'tennis'` (CHECK) |
| `locations` | `tennis_image_url text` | Tennis-Ansicht des Standorts; `NULL` → auf `main_image_url` zurückfallen |
| `court_pricing_bands` | `sport text NOT NULL DEFAULT 'padel'` | nur Admin-relevant, die App liest keine Bänder direkt |

`sport` fehlt noch in den generierten Supabase-Typen → in der App eigene Interfaces definieren oder Types neu generieren.

**Wichtig beim Lesen:** Behandle alles, was nicht ausdrücklich `'tennis'` ist, als Padel (`sport === 'tennis' ? 'tennis' : 'padel'`). Das entspricht dem DB-Default und verhindert, dass ein `null` aus einer alten Query still falsch einsortiert wird. Die Web-App nutzt dafür den Helfer `courtSport()`.

---

## 2. RPCs — exakte Live-Signaturen

### Preis + Punktefaktor eines Slots (die eine Wahrheit)
```
resolve_booking_rate(p_court_id uuid, p_start timestamptz, p_duration_minutes integer)
  -> TABLE(price_cents integer, points_multiplier numeric,
           price_band_id uuid, price_band_name text,
           points_band_id uuid, points_band_name text,
           court_sport text)
```
`RETURNS TABLE` → PostgREST liefert ein **Array**, erstes Element nehmen.

- `price_cents` ist `NULL`, wenn kein Preis gilt → dann darf **nicht** gebucht werden (Button deaktivieren).
- **Für Tennis mit Dauer ≠ 60 kommt bewusst `NULL` zurück** (fail closed), nicht etwa ein Padel-Preis.
- `court_sport` ist neu und sagt dir die Sportart ohne Zusatz-Query.
- `points_multiplier` ist der Zeitfenster-Bonus (Default `1.0`, kann bewusst `0` sein — nicht mit `|| 1` verrechnen!).

### Alle Slots eines Tages auf einmal
```
resolve_booking_rates_batch(p_court_id uuid, p_starts timestamptz[], p_duration_minutes integer)
  -> TABLE(start_time timestamptz, price_cents integer, points_multiplier numeric,
           price_band_name text, points_band_name text, court_sport text)
```
Ein Request statt N. Die Bandlogik **nicht** im Client nachbauen — sonst laufen Anzeige und Checkout auseinander.

Beim Zuordnen der Ergebnisse zu deinen Slots über `Date.getTime()` vergleichen, nicht über String-Gleichheit: Die DB liefert `+00:00`, dein Input `.000Z`.

### Günstigster Preis eines Courts („ab X €")
```
court_min_price_cents(p_court_id uuid) -> integer
```
Berücksichtigt Bänder und bei Tennis nur 60-Min-Preise.

**Falle:** Bildest du ein Standort-Minimum über mehrere Courts, dann **vorher nach Sportart filtern**. Sonst wird ein günstiger Tennis-Preis als Padel-„ab X €" ausgewiesen — genau dieser Fehler steckte in der Web-App und wurde behoben.

Alle drei sind für `anon` und `authenticated` ausführbar (die Buchungsseite ist öffentlich).

### Nur Admin/Club-Kontext (falls die App das je zeigt)
```
get_court_utilization(p_month_start date, p_sport text)
  -> TABLE(court_id, court_name, sport, location_id, location_name, location_city,
           is_active, is_online, possible_minutes, booked_minutes,
           bookings_count, capacity_pct, revenue_cents)

get_court_utilization_trend(p_court_id uuid, p_months integer, p_sport text)
get_network_utilization_trend(p_months integer, p_sport text)
```
`p_sport = NULL` heißt konsolidiert. **Kein anon-Zugriff**, nur `authenticated` mit passender Rolle.

### Nicht aufrufbar (nur zur Kenntnis)
`award_booking_payback(p_booking_id uuid, p_points integer) -> integer` ist `service_role`-only und der einzige Schreibpfad für Buchungs-Payback. Er verweigert Tennis, Gäste, Stornos und Doppelvergabe. Die App ruft ihn nie — aber er ist der Grund, warum du dich darauf verlassen kannst, dass Tennis niemals Punkte erzeugt.

---

## 3. Regeln, die der Server erzwingt — und die Fehler, die zurückkommen

### Tennis nur 60 Minuten
Erzwungen im DB-Trigger `enforce_booking_window` (greift auch beim **direkten Insert** in `bookings`, den eingeloggte Nutzer machen) und zusätzlich in jeder Edge Function.

| Pfad | Antwort bei falscher Dauer |
|---|---|
| Direkter Insert in `bookings` | Postgres-Fehler, Text beginnt mit `invalid_duration_for_sport:` |
| `create-guest-booking` | `Tennis-Plätze können nur für 60 Minuten gebucht werden` |
| `club-booking-api` | HTTP 400, `{ error: "Tennis-Plätze können nur für 60 Minuten gebucht werden" }` |
| `create-checkout-session` | Fehler mit derselben Aussage |
| `create-payment-intent` | HTTP 409 |
| `voucher-redeem` | HTTP 400 |

**Empfehlung:** Die App bietet bei Tennis gar keine andere Dauer an — dann tritt der Fall nie ein. Fange `invalid_duration_for_sport` trotzdem ab und zeige eine verständliche Meldung statt des Rohtexts.

### Tennis gibt keine Punkte
`rewards-estimate` liefert für Tennis:
```json
{
  "total_points": 0,
  "breakdown": [{
    "key": "TENNIS_NO_PAYBACK",
    "title": "Kein P2G-Payback",
    "points": 0,
    "description": "Tennis-Buchungen sammeln keine P2G-Punkte"
  }],
  "disclaimer": "Für Tennis-Buchungen werden keine P2G-Punkte gesammelt."
}
```
Es erscheint **keine** „Zeitfenster-Bonus ×0"-Zeile — das wäre irreführend, denn es liegt an der Sportart, nicht am Zeitfenster.

Nach der Zahlung bleibt `bookings.play_credits_awarded` bei `0`, die Wallet ist unverändert, und der Storno-Clawback tut folgerichtig nichts.

---

## 4. Was die App konkret tun muss

**Court-Liste eines Standorts** — `sport` mitselektieren, nach Sportart gruppieren. Vorauswahl: ein **Padel**-Court. Die Sport-Umschaltung nur zeigen, wenn der Standort tatsächlich Tennis-Courts hat.

**Dauer-Auswahl** — bei Tennis nur 60 Minuten anbieten. Beim Wechsel auf Tennis eine bereits gewählte 90/120 auf 60 zurücksetzen.

**Preise** — pro Slot aus `resolve_booking_rates_batch`. Das „ab X €" je Standort nach Sportart getrennt bilden.

**Punkte-Anzeige** — bei Tennis nicht anzeigen bzw. den Disclaimer aus `rewards-estimate` zeigen. Der `×N Punkte`-Bonus-Hinweis erscheint nur, wenn `points_multiplier > 1`.

**Bilder** — im Tennis-Kontext `locations.tennis_image_url` nutzen, mit Rückfall auf `main_image_url`. Zusätzlich gibt es einen globalen, im Admin pflegbaren Teaser-Slot: `site_visuals`-Key **`booking.tennis.teaser`** (öffentlich lesbar, Auflösung `image_url → placeholder_url → eigener Fallback`).

**Buchen selbst** — unverändert. Gleiche Tabelle, gleiche Edge Functions, gleicher Zahlungsfluss. Tennis ist kein Sonderfall im Buchungsablauf.

**Meine Buchungen** — Sportart am Court anzeigen, sonst sind „Court 1" (Padel) und „Court 1" (Tennis) nicht unterscheidbar. Dafür `courts.sport` mitjoinen.

---

## 5. Was sich NICHT geändert hat

Buchungstabelle und -ablauf · Zahlungsfluss (Stripe) · Gutschein-Logik · Club-Kontingente (hängen an `court_id`, dadurch automatisch sportgetrennt) · Wallets und Punkte-Ledger · Verfügbarkeits-View `booking_availability` (sportneutral, Tennis funktioniert dort automatisch) · Öffnungszeiten (gelten je Standort, nicht je Sportart).

Es gibt **kein Feature-Flag**: Tennis erscheint, sobald ein Tennis-Court existiert.

---

## 6. Stand

Migrationen `20260812100000`, `20260812110000`, `20260812120000` sind **live ausgeführt und verifiziert**. Fünf Invarianten wurden gegen die Live-DB bewiesen: 90-Min-Tennis abgelehnt · 60-Min akzeptiert · Payback 0 · Tennis-Band mit 90-Min-Preis abgelehnt · Padel-Band auf Tennis-Court abgelehnt.

Die Edge Functions (stripe-webhook, create-checkout-session, create-guest-booking, create-payment-intent, rewards-estimate, club-booking-api, voucher-redeem) müssen **vor dem ersten Tennis-Court** deployed werden — sonst blockt die Datenbank zwar korrekt, aber die Fehlermeldungen kommen technisch statt verständlich.
