# Änderungs-Doku Web-Session 02.–03.08.2026 (Handoff für die App)

**Zweck:** Übersicht aller Änderungen dieser Session, damit die iOS-/Expo-App-Session (gleiches Supabase-Backend `wvvdkuextsbsecqbfksb`) relevante Teile übernehmen kann.
**Deploy-Status:** Alle Migrationen sind live ausgeführt, alle genannten Edge Functions sind deployed, Web ist via Vercel auf Production.

**App-Relevanz-Legende:**
- 🔴 **Backend geändert** — App teilt diese API/DB, Verhalten hat sich geändert
- 🟡 **Backend erweitert** — neue Daten/Felder, App KANN sie nutzen
- ⚪ **Nur Web** — Styling/Web-UI, für App nur als Design-Referenz

---

## 1. 🔴 Punkterabatt: fixer Deckel pro Produkt (Commit `3e215d7`)

**Der wichtigste Backend-Change der Session.** Das Admin-Feld „Punkte-Rabatt (max.)“ (= `marketplace_items.credit_cost`) wird jetzt **serverseitig durchgesetzt** — vorher hatte es keinerlei Wirkung.

- **Neue Einlöse-Regel** in `marketplace-checkout` (deployed): maximal einlösbare Punkte = `min(item.credit_cost, Preis, Guthaben)` — **pro Bestellung, mengenunabhängig**. `credit_cost = 0` → kein Punkterabatt bei diesem Produkt.
- **Der frühere globale Prozent-Cap (`credits_payment_max_percent`, 50 % vom Warenwert) gilt für Marketplace-Käufe NICHT mehr.**
- Frontend-Spiegel: `maxRedeemablePoints(subtotalCents, balance, centsPerPoint, productCapPoints)` in `src/lib/marketplace.ts` — **Signatur geändert** (vorher `maxPercent`-Parameter). Falls die App diese Logik kopiert hat: anpassen!
- Einlösung bleibt am Flag `site_settings.feature_credits_payment_enabled` gated (Stand: **AUS**).
- **⚠️ Offener Punkt aus dem Rechts-Audit:** AGB § 8 sagt noch „max. 50 % des Warenwerts“ — widerspricht der neuen Fix-Deckel-Logik. Entscheidung ausstehend (AGB anpassen ODER 50 %-Cap zusätzlich wieder einziehen).

**Bestell-Dokumentation (Migration `20260803130000`, live):**
- Neue Spalten `marketplace_redemptions.points_balance_before` / `points_balance_after` — Punktestand des Users unmittelbar vor/nach der Einlösung, atomar im selben Txn wie der Abzug gesnapshottet (`insert_marketplace_order` ersetzt).
- Admin → Marketplace → Bestellungen zeigt: „X P. eingelöst · Stand: vorher → nachher“.

**App-Aufgaben:** Checkout-Slider/Anzeige auf Produkt-Deckel umstellen (`item.credit_cost` statt Prozent), Texte anpassen („Max. X Points bei diesem Produkt“).

---

## 2. 🔴 Payback: 90-Minuten-Satz + Storno-Rückbuchung (Commit `0bf9291`)

**Bugfix 1 — 90-Min-Satz:** 90-Min-Buchungen bekamen bisher fälschlich den 60er-Satz. Neu: `site_settings.payback_points_90min` (Default 150, Migration `20260803150000`, live). Stufenlogik `≥120 → 120er, ≥90 → 90er, sonst 60er` jetzt in:
- `stripe-webhook` (vergibt Payback nach Zahlung) — deployed
- `create-checkout-session` (Gratis-Buchungs-Pfad) — deployed
- `rewards-estimate` (Payback-Vorschau im Checkout; liefert jetzt auch „90 Min Buchung“ als Beschreibung) — deployed
- Admin → P2G-Punkte → „Payback pro Buchung“: drittes Feld „90 Min“

**Bugfix 2 — Storno-Clawback (kritisch):** Das Buchungs-Payback (`bookings.play_credits_awarded`) wurde bei Stornierung/Erstattung **nie zurückgebucht** (User konnte buchen → Punkte kassieren → stornieren → Punkte behalten). Neu:
- RPC `clawback_booking_payback(booking_id, refund_pct)` (Migration `20260803150000`, live): nimmt das Payback anteilig zurück; idempotent (Single-Winner über die Spalte, Row-Lock), Wallet wird auf 0 gekappt (nie Negativsaldo), Ledger-Eintrag `REVERSAL`/`PLAY` + User-Notification.
- Aufgerufen im `bookingRefunded`-Pfad von `rewards-trigger` (deployed) → deckt **beide** Storno-Wege ab: User-Storno (`cancel-booking`) und Stripe-Erstattung (`charge.refunded`-Webhook). Teil-Erstattungen → anteiliger Clawback.
- Härtung: `stripe-webhook` vergibt kein Payback mehr auf Buchungen mit `status = cancelled` (verhindert Re-Award durch verspätete Webhook-Retries nach Clawback).

**App-Aufgaben:** Keine Code-Änderung nötig (alles serverseitig). Wissen: Punktestände können sich nach Storno reduzieren; die Payback-Vorschau (rewards-estimate) kennt jetzt 90 min.

---

## 3. 🟡 Marken-Logos (Commit `7c2fab7`)

- `marketplace_brands.logo_url` (Spalte existierte bereits) wird jetzt gepflegt: Upload/Ändern/Entfernen im Admin-Marken-Dialog; Dateien liegen im Storage-Bucket `media` unter `marketplace/brand-logos/`.
- Web-Anzeige: Logo als **Kreis oben links auf dem Produktbild** — Shop-Karten, „Ähnliche Produkte“, Produktseiten-Hauptbild. Bestseller-Badge rückt daneben.

**App-Aufgaben:** `logo_url` aus `marketplace_brands` mitladen und identisch als Kreis-Badge oben links rendern (Parität).

---

## 4. 🟡 News: TXT-Import + Schreibstile (Commit `027b8c5`)

- **TXT-Support:** Der Wochen-News-Generator (Admin) akzeptiert neben PDF/HTML jetzt `.txt`-Quellen (`generate-news-from-urls`, deployed; `files[].kind` kann jetzt `"txt"` sein).
- **Schreibstile:** Neue Tabelle `news_writing_styles` (Migration `20260803090000`, live; RLS admin-only): mehrere Stile mit Name + Beispieltexten. Verwaltung in Admin → News → „Schreibstile verwalten“ (`WritingStyleManager`). Der Generator sendet optional `style_id`; die Edge Function hängt bis zu 8.000 Zeichen Beispieltext als Stil-Vorgabe an den System-Prompt (nur Ton/Struktur, nie Inhalte).
- Gilt NICHT für den Voice-Artikel (`generate-article`) — bei Bedarf nachrüsten.

**App-Aufgaben:** Keine — reines Admin-/Redaktions-Tooling; die App konsumiert weiterhin nur `articles`.

---

## 5. ⚪ Marketplace: Bildformat 2:3 + Produktseiten-Redesign (Commits `1966805`, `113e531`, `9d9f67e`, `f431a3d`)

- **Bildformat-Standard: 2:3 Hochformat** (Referenzfoto `docs/1R7A0443.jpg`, 5464×8192). Alle Web-Produktbilder rendern in `aspect-[2/3]` (object-cover-Zuschnitt); Admin-Upload zeigt 2:3-Vorschau + Hinweis „1200 × 1800 px empfohlen“.
- **Finales Produktseiten-Layout (Web):**
  - Links: Hauptbild 2:3, darunter weitere Bilder als klickbare 2:3-Thumbnails
  - Rechts: Buy-Box („Jetzt kaufen“), darunter Karte „Technische Details“ (füllt die Spalte bündig auf Bildhöhe)
  - Vollbreit darunter: Herstellerangaben (GPSR), dann als Abschluss die Beschreibung
- **KI-Neugenerierung in der Edit-Maske:** „Per URL oder Datei neu generieren (AI)“ jetzt auch bei bestehenden Produkten — Felder werden neu befüllt, Slug/Titelbild/gepflegte Galerie bleiben erhalten.

**App-Aufgaben:** Produktbilder ebenfalls in **2:3** rendern (Format-Standard gilt plattformweit); Layout als Design-Referenz.

---

## 6. ⚪ Section-Farbwelten: Marketplace-Produktseite + kompletter Buchungsflow (Commits `1966805`, `4bf2d69`)

Die Farben kommen aus Admin → Farben (`site_visuals`, Keys `app.theme.*`) — **dieselben Werte steuern die App**. Neu im Web:

- **Marketplace-Produktseite** nutzt jetzt das Section-Theme `market` (Orange, Default `#FF8A00`) + Shader-Backdrop — wie die Shop-Übersicht.
- **Kompletter Buchungsflow** (Standort/Slots, Checkout, Success, Cancel + Gast-Modal) in Section-Farbe `booking` (Blau, Default `#2F7BFF`) + Shader auf jeder Seite. Alle hartkodierten Lime-Werte (Gradients, Glow-Schatten, „Verfügbar“-Ampel der Standortkarten) auf `var(--primary)` umgestellt.
- **Technisch relevant:** `sectionThemeVars()` (Web) überschreibt jetzt zusätzlich `--lime-glow` mit einer helleren Stufe der Section-Farbe (Hero-Button-Verläufe färben sauber mit).

**App-Aufgaben:** Keine neuen Werte — die App liest `app.theme.*` bereits. Falls die App den Buchungsflow/Marktplatz einfärbt: gleiche Zuordnung verwenden (booking = Blau inkl. aller Akzente, market = Orange auch auf der Produktseite).

---

## Übersicht: Migrationen & Edge-Function-Deploys (alle erledigt)

| Migration | Inhalt | Status |
|---|---|---|
| `20260803090000_news_writing_styles.sql` | Tabelle `news_writing_styles` + RLS | ✅ live |
| `20260803130000_marketplace_points_discount_docs.sql` | `points_balance_before/after` + `insert_marketplace_order` v2 | ✅ live |
| `20260803150000_payback_90min_and_clawback.sql` | `payback_points_90min` + RPC `clawback_booking_payback` | ✅ live |

| Edge Function | Änderung | Status |
|---|---|---|
| `generate-news-from-urls` | TXT-Quellen + Schreibstil-Vorgabe | ✅ deployed |
| `marketplace-checkout` | Fixer Punkte-Deckel pro Produkt | ✅ deployed |
| `stripe-webhook` | 90-Min-Satz + kein Payback auf stornierte Buchungen | ✅ deployed |
| `create-checkout-session` | 90-Min-Satz (Gratis-Pfad) | ✅ deployed |
| `rewards-estimate` | 90-Min-Satz + Label | ✅ deployed |
| `rewards-trigger` | Payback-Clawback im `bookingRefunded`-Pfad | ✅ deployed |

**Sonstiges:** Die GitHub-Repos sind zur Org `TrinityStudiosGmbH` umgezogen (`padel2go_live` bzw. `padel2go-edit-8beb07f0`); Pushes über die alten URLs funktionieren per Redirect weiter.

**Offene Entscheidungen (Florian):** (1) AGB-50 %-Cap vs. Fix-Deckel auflösen (s. Abschnitt 1); (2) `feature_credits_payment_enabled` einschalten, sobald Punkterabatt live gehen soll; (3) Ergebnisse des P2G-Rechts-Audits (Verfalls-Engine, Chargeback-Handler, Kursversion im Ledger, Punkte-Historie im Account) priorisieren.
