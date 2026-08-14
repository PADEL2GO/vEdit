# Vereinsmitglieder — Mitgliederpreise, Monatslimit, Freikontingent

**Datum:** 2026-08-14
**Status:** freigegeben, in Umsetzung

## Problem

Tennisvereine sollen ihre Mitglieder auf PADEL2GO-Courts günstiger spielen lassen. Heute kennt die
Plattform nur zwei Preise: den Externenpreis (`court_prices` + Zeitfenster-Bänder) und das kostenlose
Club-Kontingent, das ausschließlich der Club-Manager im Portal verbuchen kann. Es fehlt:

1. eine Mitgliedsrolle mit Vereinsbezug, vergebbar im Admin **und** durch den Verein selbst,
2. unterschiedliche Konditionen im Heimatverein vs. auf fremden Courts,
3. eine Missbrauchsbremse, damit Mitglieder nicht dauerhaft für Externe billiger buchen,
4. die Möglichkeit, das Vereins-Freikontingent für Mitglieder freizugeben — optional, weil manche
   Vereine allein darüber verfügen wollen.

## Die Regel

| | **Padel** | **Tennis** |
|---|---|---|
| **Heimatverein-Court** | Heim-Kondition: €-Rabatt **oder** Festpreis je Dauer | **0 €, unbegrenzt** |
| **Fremder P2G-Court** | Externenpreis − fixer €-Abzug | Externenpreis, kein Rabatt |
| **Nichtmitglied / Gast** | Externenpreis | Externenpreis |

**Heim-Court** = jeder Court, für den der Verein eine `club_court_assignments`-Zeile hat. Ein Verein
ohne Court-Zuweisung bekommt überall den Fremd-Rabatt.

**Zusätzlich** bei Heim-Padel: Buchung gegen das Vereins-Freikontingent (0 €), wenn der Verein das
freigegeben hat — mit einem Pro-Kopf-Deckel in Minuten pro Monat.

### Grenzfälle

- Rabatt > Preis → Preis 0 €, nie negativ.
- Ergebnis zwischen 1 und 49 Cent → 0 € (Stripe kann unter 50 Cent nicht abrechnen; frei ist
  freundlicher als heraufsetzen und entspricht dem bestehenden Free-Path).
- Festpreis-Modus schlägt Zeitfenster-Bänder vollständig: der vereinbarte Mitgliederpreis gilt
  unabhängig von der Tageszeit.
- Rabatt-Modus rechnet auf den *aufgelösten* Preis, also inklusive Band.
- Punkte-Payback bleibt unverändert: dauerbasiert, nur Padel, nie bei `is_free_allocation`.
- Gutscheine greifen nach dem Mitgliederrabatt auf den bereits reduzierten Preis.

## Monatslimit

Ein gemeinsamer Topf pro Mitglied und Monat für **vergünstigte Padel-Buchungen** (Heim + Fremd).
Nicht mitgezählt: kostenloses Heim-Tennis (eigene, unbegrenzte Regel) und Freikontingent-Buchungen
(die haben ihren eigenen Minuten-Deckel).

- Gezählt wird nach dem **Monat des Spieltermins** (Europe/Berlin).
- Gezählt werden `confirmed` und noch laufende Reservierungen (`pending_payment` mit
  `hold_expires_at > now()`). **Storno gibt den Platz automatisch frei** — es braucht kein zweites
  Ledger, weil der Zähler eine Abfrage über den Buchungsbestand ist.
- Limit erschöpft → die Buchung wird nicht blockiert, sie kostet den Externenpreis. Der Slot-Picker
  zeigt das vorher an, damit im Checkout kein Preissprung entsteht.
- `monthly_discount_limit IS NULL` = unbegrenzt.

## Datenmodell

### `club_memberships` (neu)

Bewusst **getrennt** von `club_users`: jede aktive Zeile dort öffnet heute das Club-Portal
(`useClubAuth`, `club-booking-api`, `club-court-update`). Mitglieder dürfen dort nicht hinein.

| Spalte | Bedeutung |
|---|---|
| `user_id` **UNIQUE** | genau ein Verein pro Nutzer — als DB-Invariante, nicht als UI-Konvention |
| `club_id` | der Verein |
| `is_active`, `valid_until` | Mitgliedschaft aussetzen / befristen (`valid_until` NULL = unbefristet) |
| `source` | `admin` \| `club` \| `invite` — wer die Rolle vergeben hat |
| `created_by` | vergebender Nutzer |

### `club_member_terms` (neu, 1:1 zum Verein)

`home_mode` (`discount`\|`fixed`) · `home_discount_cents` · `home_price_60_cents` ·
`home_price_90_cents` · `home_price_120_cents` · `away_discount_cents` (Standard 1000) ·
`monthly_discount_limit` (NULL = unbegrenzt) · `quota_enabled` · `quota_minutes_per_member`

### `club_member_invites` (neu)

Offene Einladungen auf E-Mail-Adressen ohne Konto: `club_id`, `email` (kleingeschrieben),
`status` (`pending`\|`accepted`\|`revoked`), `invited_by`, `accepted_user_id`, `accepted_at`.
UNIQUE über (`club_id`, `email`) solange `pending`.

### Erweiterungen

- `bookings`: `member_club_id`, `member_scope` (`home`\|`away`), `member_discount_cents`
  → an jeder Buchung ist nachweisbar, welcher Verein welchen Rabatt ausgelöst hat.
- `club_quota_ledger`: `member_user_id` → Grundlage des Pro-Kopf-Deckels.

## Preisauflösung

`resolve_booking_rate()` bleibt die einzige Stelle, die einen Preis kennt. Sie bekommt einen
vierten Parameter `p_user_id` (Default NULL) und vier zusätzliche Rückgabespalten:
`base_price_cents`, `member_scope`, `member_discount_cents`, `member_limit_remaining`.
Ohne Mitgliedschaft ist das Ergebnis identisch zum heutigen Verhalten.

Die eigentliche Mitgliedslogik liegt in `resolve_member_pricing(user, court, start, dauer)`, damit
Vorschau, Trigger und Edge Functions dieselbe Funktion benutzen und nicht auseinanderlaufen können.

**Kein Spoofing:** die Funktion arbeitet mit `auth.uid()`. Ein explizit übergebenes `p_user_id` wird
nur akzeptiert, wenn der Aufrufer die Service-Rolle ist (Edge Functions). Ein Client kann sich damit
keinen fremden Mitgliederpreis anzeigen lassen.

Weil sich Signatur *und* Rückgabetyp ändern, werden `resolve_booking_rate` und
`resolve_booking_rates_batch` in der Migration gedroppt und neu angelegt. Bestehende 3-Argument-Aufrufe
in den Edge Functions funktionieren über den Default weiter.

## Limit-Durchsetzung

Ein `BEFORE INSERT`-Trigger auf `bookings` (`apply_member_pricing`) stempelt bei
`booking_origin = 'user'` und gesetztem `user_id`:
`price_cents`, `member_club_id`, `member_scope`, `member_discount_cents`.

Der Trigger nimmt vorher einen `pg_advisory_xact_lock` auf den Nutzer und zählt unter diesem Lock die
vergünstigten Buchungen des Termin-Monats. Zwei gleichzeitige Buchungen können das Limit damit nicht
gemeinsam überziehen. Der clientseitig mitgeschickte `price_cents` wird überschrieben — die
Preishoheit liegt vollständig in der Datenbank.

`create-checkout-session` und `create-payment-intent` rechnen weiterhin serverseitig nach und kommen
über dieselbe Funktion auf dasselbe Ergebnis.

## Freikontingent für Mitglieder

Nur Heim-Padel, nur bei `quota_enabled`. Im Checkout erscheint der verbleibende Vereins-Rest und der
persönliche Rest; das Mitglied entscheidet aktiv per Schalter (**nicht** automatisch — sonst ist das
gemeinsame Kontingent binnen Tagen leer).

`claim_member_quota(booking_id)` prüft unter Row-Lock Vereins- **und** Pro-Kopf-Rest, schreibt den
`club_quota_ledger`-Eintrag mit `member_user_id`, setzt `is_free_allocation`, `allocation_minutes`,
`club_id` und `price_cents = 0`. Derselbe Topf, den der Club-Manager im Portal sieht.

`cancel-booking` bucht die Minuten bei Storno zurück — das macht es heute nur für
Club-Portal-Buchungen (`club-booking-api`).

## Mitgliederverwaltung

Eine Tabelle, zwei Zugänge — der Verein sieht eine vom Admin vergebene Rolle sofort und umgekehrt.

### Admin

- **AdminUsers:** neue Rolle *Vereinsmitglied*. Klick öffnet Vereinsauswahl (+ optional „gültig bis"),
  in der Liste erscheint der Chip „Vereinsmitglied · TC Musterstadt".
- **AdminClubs:** pro Verein der Abschnitt *Mitglieder-Konditionen* mit allen Feldern aus
  `club_member_terms`, dazu die Mitgliederliste mit Zähler „X vergünstigte Buchungen diesen Monat".

### Club-Portal (`/club/members`, neu)

- **Einladen:** ein Feld für mehrere E-Mail-Adressen (Komma oder Zeilenumbruch). Für jede Adresse:
  existiert ein Konto → Mitgliedschaft sofort aktiv + In-App-Benachrichtigung; sonst → offene
  Einladung, die beim nächsten Login dieses Kontos automatisch greift.
- **Übersicht:** Mitgliederliste mit Buchungen gesamt / diesen Monat, davon vergünstigt, gewährter
  Rabatt in €, genutzte Freikontingent-Minuten, letzte Buchung.
- **Entfernen:** Mitgliedschaft beenden, offene Einladung zurückziehen. Nur `role_in_club = 'manager'`;
  `staff` sieht die Liste nur.

Alles über eine neue Edge Function `club-members-api` (Muster wie `club-booking-api`), weil das
Nachschlagen einer E-Mail in `auth.users` die Service-Rolle braucht.

### Einladung einlösen

`claim_club_member_invites()` — SECURITY DEFINER, liest `auth.uid()` und die E-Mail aus dem JWT,
wandelt passende offene Einladungen in Mitgliedschaften um. Wird beim Login einmal pro Session
aufgerufen (`onAuthStateChange`). Damit greift eine Einladung sowohl für bestehende Konten als auch
für Nutzer, die sich erst nach der Einladung registrieren.

Eine Einladung wird nur eingelöst, wenn die E-Mail des Kontos bestätigt ist — eine Mitgliedschaft ist
bares Geld wert und darf nicht über eine fremde, unbestätigte Adresse erschleichbar sein.

## Sichtbarkeit / Datenschutz

Der Club-Manager sieht das Buchungsvolumen seiner Mitglieder — auch auf fremden Courts, aggregiert
(Anzahl, Rabattsumme, Standortname). Das ist der Zweck: der Verein finanziert den Rabatt mit und muss
Missbrauch erkennen können. Keine Einsicht in Zahlungsdaten, keine Einsicht in Buchungen von
Nichtmitgliedern.

## Nicht in diesem Umfang

Selbstregistrierung von Mitgliedern ohne Einladung, Rabatte auf Events/Marketplace, mehrere Vereine
pro Nutzer, E-Mail-Versand der Einladung (nur In-App-Benachrichtigung), Mitgliedsausweis/QR.

## Bewusste Kompromisse

1. **Kostenloses Heim-Tennis ist unbegrenzt.** Es gibt damit keine Bremse gegen Dauerblocker auf den
   Vereins-Tenniscourts. Jede dieser Buchungen wird gestempelt und ist in AdminBookings auswertbar,
   ein Deckel lässt sich jederzeit nachziehen.
2. **Das Tageslimit von 15 bestätigten Buchungen plattformweit** in `create-checkout-session` gilt
   auch für kostenlose Mitgliederbuchungen. Launch-Schutz, bleibt vorerst unangetastet.
