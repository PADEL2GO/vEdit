# Zeitfenster-Bänder (Preise + P2G-Punkte) & Launch-Reset

**Datum:** 2026-08-10 · **Status:** freigegeben, in Umsetzung
**Migration:** `supabase/migrations/20260810120000_court_pricing_bands.sql` (live ausgeführt + verifiziert)

---

## Teil 1 — Zeitfenster-Bänder

### Problem
Court-Preise gelten heute pauschal je Court und Dauer (`court_prices`: 60/90/120 Min). Es gibt keine Möglichkeit, Tageszeiten unterschiedlich zu bepreisen (Frühtarif, Prime Time) oder die P2G-Punkte zeitabhängig zu erhöhen, um Randzeiten attraktiv zu machen.

### Ansatz: Override-Schicht statt Ersatz
Bänder überschreiben das bestehende Modell nur dort, wo sie greifen:

1. Band für **diesen Court** passt (Wochentag + Zeitfenster) → dessen Wert
2. sonst **globales** Band passt → dessen Wert
3. sonst → heutiger `court_prices`-Preis bzw. Punkte-Faktor 1,0

**Ohne angelegtes Band verhält sich die Plattform exakt wie vorher.** Keine Datenmigration, kein Big-Bang, schrittweise einführbar.

### Datenmodell `court_pricing_bands`

| Spalte | Bedeutung |
|---|---|
| `court_id` | `NULL` = global, sonst nur dieser Court |
| `name` | „Frühtarif", „Prime Time" |
| `weekdays smallint[]` | ISO 1=Mo … 7=So |
| `start_minute` / `end_minute` | Minuten ab Mitternacht, Ende exklusiv |
| `price_cents_60/90/120` | je **optional** — leer = Standardpreis gilt weiter |
| `points_multiplier` | **optional** — leer = ×1,0 |
| `priority` | höher gewinnt bei Überlappung |
| `is_active` | ausschalten ohne löschen |

Preise und Multiplikator sind **einzeln** optional. Damit sind reine Punkte-Bänder möglich („6–8 Uhr doppelte Punkte, Preis normal") ebenso wie reine Preisbänder.

### Bewusste Einschränkungen
- **Kein Band über Mitternacht** (CHECK `end_minute > start_minute`). 22–02 Uhr wird als zwei Bänder angelegt. Hält die Auflösung frei von Sonderfällen.
- **Feste Zeitzone `Europe/Berlin`.** „6 Uhr" bleibt auch nach der Zeitumstellung 6 Uhr.
- **Dauer-Zuordnung exakt** (60/90/120), identisch zum heutigen `court_prices`-Verhalten.

### Eine Wahrheit: `resolve_booking_rate()`
Sämtliche Konsumenten — Checkout, Gästebuchung, Payment-Intent, Payback-Gutschrift, Punkte-Vorschau, Buchungsseite — rufen **dieselbe** SQL-Funktion auf. Damit können Vorschau, Checkout und Gutschrift nicht auseinanderlaufen. `price_cents` ist `NULL`, wenn weder Band noch `court_prices` liefern; der Aufrufer wirft dann wie bisher einen Fehler.

Zwei Helfer darauf:
- `resolve_booking_rates_batch(court, starts[], dauer)` — alle Slots eines Tages in einem Request (kein N+1, keine Client-Logik)
- `court_min_price_cents(court)` — günstigster Preis inkl. Bänder, damit die „ab X €"-Anzeige ehrlich bleibt

### Punkte-Rechenweg
`Punkte = Basissatz(Dauer) × Band-Multiplikator × Level-Multiplikator`

Basissatz (`site_settings.payback_points_{60,90,120}min`) und Level-Multiplikator bleiben unverändert. Der Band-Faktor wird zum **Buchungs-Startzeitpunkt** aufgelöst, nicht zum Zahlungszeitpunkt — sonst bekäme jemand, der abends eine 7-Uhr-Buchung bezahlt, den falschen Satz. Der Storno-Clawback bleibt unangetastet, da er mit dem gespeicherten `bookings.play_credits_awarded` rechnet.

### Admin
Neue Seite **Preise & Punkte** (Sidebar-Gruppe „Betrieb"): globale und Court-Bänder an einem Ort, Wochentag-Chips, Zeitfelder, Preise in Euro, Multiplikator. Kernstück ist ein **Wochenraster als Vorschau**, das zeigt, welches Band wann greift — Überlappungen wären sonst unsichtbar.

### Bekannte Altlast
`court_prices.court_id` ist seit Migration `20251219134814` `NOT NULL`; die globalen Fallbacks (`.is("court_id", null)`) in den Edge Functions und `useGlobalPrices` konnten nie treffen — toter Code. Die Band-Tabelle übernimmt die „global"-Rolle jetzt sauber.

---

## Teil 2 — Launch-Reset

### Problem
Vor dem Go-Live müssen Testbuchungen, Test-Bestellungen und Testpunkte verschwinden — ohne Stammdaten, Inhalte oder Benutzerkonten anzutasten.

### Ablauf
Karte in **Admin → Einstellungen**: Vorschau mit exakten Zeilenzahlen je Kategorie → Kategorien einzeln anhaken (standardmäßig alle abgewählt) → Tippbestätigung `RESET` → Ausführung über service-role-Edge-Function (`admin-credits`, Actions `launch_reset_preview` / `launch_reset_execute`). Ist `feature_app_launched` bereits true, erscheint eine deutliche Warnung — aber keine Sperre.

### Kategorien

| Kategorie | Tabellen |
|---|---|
| Buchungen & Zahlungen | booking_participants, booking_players, payments, voucher_redemptions, club_quota_ledger, bookings |
| Marketplace-Bestellungen | marketplace_returns, marketplace_price_history, marketplace_redemptions |
| P2G-Punkte & Wallets | points_ledger, reward_instances, friend_reward_grants, user_streaks (+ wallets auf 0, `play_credits_awarded` auf 0) |
| Belege | receipts (+ receipt_counters auf 0) |
| Social & Lobbies | lobby_invites, lobby_events, lobby_members, lobbies, friendships, chat_messages, news_likes |
| Event-Anmeldungen | event_registrations |
| Benachrichtigungen & Logs | notifications, admin_activity_log, rate_limit_log, device_tokens |

### Append-Only-Hürde beim Punkte-Ledger (nachträglich gelöst)
`points_ledger` ist per Trigger `trg_points_ledger_guard` append-only — er blockt **jedes** DELETE, auch für service_role, und `reward_instances` hängt über einen NO-ACTION-Fremdschlüssel daran. Der Reset wäre an dieser Kategorie gescheitert.

Gelöst über eine eng begrenzte Ausnahme (Migration `20260810140000_launch_reset_points_bypass.sql`) statt einer Aufweichung des Schutzes: Der Guard erlaubt DELETE zusätzlich, wenn das **transaktionslokale** Flag `app.launch_reset` gesetzt ist. Setzen kann es ausschließlich die SECURITY-DEFINER-Funktion `launch_reset_wipe_points()`, für die nur `service_role` Ausführungsrecht hat. Da `set_config(..., is_local => true)` mit der Transaktion endet, kann das Flag nicht nachwirken. Verifiziert: ein normales DELETE scheitert weiterhin mit `points_ledger is append-only`.

### Zwei bewusste Entscheidungen
- **Wallets werden auf 0 gesetzt, nicht gelöscht** — sonst stünde ein Nutzer ohne Wallet-Zeile da.
- **Belegzähler wird zurückgesetzt**, damit der erste echte Beleg nach dem Launch die Nummer 1 trägt (GoBD-relevante Sequenz).

### Unantastbar
Courts, Standorte, Preise/Bänder, Clubs, Produkte, Artikel, Events, sämtliche Inhalts- und Einstellungstabellen, Profile, Rollen — und **Newsletter-Abonnenten** (echte Interessenten, bewusst ausgeklammert).

Kategorien sind unabhängig: Wer nur „Marketplace" wählt, verliert keine Buchung.
