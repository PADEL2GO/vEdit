# App-Handoff: Vereinsmitglieder

**Stand:** 2026-08-14 · Backend vollständig live auf `wvvdkuextsbsecqbfksb`
**Web-Design:** `docs/superpowers/specs/2026-08-14-vereinsmitglieder-design.md`

Alle Signaturen unten sind aus der Live-Datenbank ausgelesen, nicht aus dem Kopf geschrieben.

---

## 1 · Was fachlich passiert ist

Ein Nutzer kann Mitglied **genau eines** Vereins sein. Daraus folgt für den Preis:

| Court | Padel | Tennis |
|---|---|---|
| **Heimatverein** (Verein hat Court-Zuweisung) | vereinbarte Kondition: €-Abzug **oder** Festpreis je Dauer | **0 €, unbegrenzt** |
| **Fremder P2G-Court** | Externenpreis − fixer €-Abzug | Externenpreis, kein Rabatt |
| **Nichtmitglied / Gast** | Externenpreis | Externenpreis |

Zusätzlich, wenn der Verein es freigegeben hat: auf Heim-Padel-Courts kann das Mitglied gegen das
**Vereins-Freikontingent** buchen (0 €), begrenzt durch einen Vereins- und einen Pro-Kopf-Deckel.

Vergünstigte Padel-Buchungen sind pro Mitglied und Monat gedeckelt. Kostenloses Heim-Tennis und
Kontingent-Buchungen zählen **nicht** gegen dieses Limit.

---

## 2 · Der wichtigste Punkt: Preise kommen fertig aus der DB

`resolve_booking_rate` liefert in `price_cents` **den zu zahlenden Preis** — bei einem Mitglied ist
die Kondition dort bereits eingerechnet. Die App rechnet **nichts** selbst nach.

```
resolve_booking_rate(
  p_court_id           uuid,
  p_start              timestamptz,
  p_duration_minutes   integer,
  p_user_id            uuid DEFAULT NULL,
  p_exclude_booking_id uuid DEFAULT NULL
) RETURNS TABLE (
  price_cents            integer,   -- zu zahlender Preis (inkl. Mitglieder-Kondition)
  points_multiplier      numeric,
  price_band_id          uuid,
  price_band_name        text,
  points_band_id         uuid,
  points_band_name       text,
  court_sport            text,
  base_price_cents       integer,   -- NEU: Externenpreis VOR Kondition
  member_club_id         uuid,      -- NEU
  member_scope           text,      -- NEU: 'home' | 'away' | NULL
  member_discount_cents  integer,   -- NEU: tatsächlich gewährter Abzug
  member_limit_remaining integer    -- NEU: Rest im Monat; NULL = unbegrenzt / kein Mitglied
)
```

Und für eine ganze Slot-Liste in einem Request:

```
resolve_booking_rates_batch(
  p_court_id         uuid,
  p_starts           timestamptz[],
  p_duration_minutes integer,
  p_user_id          uuid DEFAULT NULL
) RETURNS TABLE (
  start_time, price_cents, points_multiplier, price_band_name, points_band_name,
  base_price_cents, member_scope, member_discount_cents, member_limit_remaining
)
```

**`p_user_id` NICHT mitschicken.** Die Funktion nimmt `auth.uid()` aus dem JWT. Ein explizit
übergebenes `p_user_id` wird nur von der Service-Rolle akzeptiert und sonst ignoriert — das ist
Absicht, sonst könnte ein Client die Vereinszugehörigkeit fremder Nutzer abfragen.

**Darstellung:** Wenn `member_discount_cents > 0`, zeig `base_price_cents` durchgestrichen neben
`price_cents`. Ist `price_cents = 0`, schreib „kostenlos" statt „0,00 €".

---

## 3 · Kritisch: `create-payment-intent` kann jetzt `{ free: true }` liefern

Kostet die Buchung 0 € — Heim-Tennis eines Mitglieds oder Freikontingent — wird **kein
PaymentIntent** erzeugt:

```json
{ "free": true, "amount_cents": 0, "publishable_key": "pk_..." }
```

Ablauf in der App:

```
POST create-payment-intent { booking_id }
   ├── Antwort hat client_secret  → PaymentSheet wie bisher
   └── Antwort hat free: true     → PaymentSheet NICHT öffnen
                                     POST create-checkout-session { booking_id }
                                     Antwort: { url: null, free: true }
                                     → Buchung ist bestätigt, Mail ist raus
```

`create-checkout-session` erledigt auf dem Free-Path alles, was sonst der Stripe-Webhook macht:
Reserven verrechnen, Buchung auf `confirmed` setzen, Bestätigungsmail verschicken.

**Ohne diese Anpassung** würde die App auf eine 0-€-Buchung Stripes Mindestbetrag von 50 Cent
abrechnen. Das ist der einzige echte Breaking-Point dieses Epics für die App.

---

## 4 · Ebenfalls kritisch: Einladungen beim Login einlösen

Vereine laden Mitglieder per E-Mail-Adresse ein. Existiert zu der Adresse noch kein Konto, liegt die
Einladung offen und greift **erst beim nächsten Login** dieses Kontos. Ausgelöst wird das vom
Client:

```
rpc('claim_club_member_invites')  → integer (0 oder 1 = eingelöste Einladungen)
```

**Einmal pro Session nach dem Login aufrufen**, ohne await, Fehler ignorieren. Ruft die App das
nicht auf, bekommt ein per E-Mail eingeladenes Mitglied, das ausschließlich die App nutzt, seine
Mitgliedschaft nie — und zahlt weiter den Externenpreis.

Die Web-Umsetzung sitzt in `src/hooks/useAuth.tsx` in `onAuthStateChange`, dedupliziert über ein
`Set` der bereits behandelten User-IDs.

Nebeneffekt: bei Erfolg wird eine Notification vom Typ `system` mit Titel
„Vereinsmitgliedschaft aktiv" geschrieben — die taucht ohne weiteres Zutun in der bestehenden
Benachrichtigungsliste auf.

Die Einlösung verlangt eine **bestätigte E-Mail-Adresse** (`auth.users.email_confirmed_at`). Eine
Mitgliedschaft ist bares Geld wert und darf nicht über eine fremde, unbestätigte Adresse
erschleichbar sein.

---

## 5 · Anzeige der eigenen Mitgliedschaft

```
rpc('my_club_membership') → TABLE (
  club_id                uuid,
  club_name              text,
  home_mode              text,     -- 'discount' | 'fixed'
  home_discount_cents    integer,
  away_discount_cents    integer,
  monthly_discount_limit integer,  -- NULL = unbegrenzt
  discount_used_month    integer,
  quota_enabled          boolean
)
```

Leeres Ergebnis = kein Mitglied. Reicht für einen Hinweis der Art
„Noch 3 von 8 vergünstigten Buchungen diesen Monat" (`monthly_discount_limit − discount_used_month`).

**Wichtig fürs UI:** ist das Limit erschöpft, wird die Buchung **nicht blockiert** — sie kostet dann
den Externenpreis. Zeig das **vor** der Slot-Auswahl an, sonst springt der Preis im Checkout.

---

## 6 · Freikontingent (optional, kann nachgezogen werden)

Nur Heim-Padel, nur wenn der Verein es freigegeben hat.

```
rpc('member_quota_summary', { p_court_id, p_start }) → TABLE (
  club_id, club_name, quota_enabled boolean,
  club_remaining integer,    -- Rest des Vereins auf DIESEM Court, in Minuten
  member_remaining integer   -- persönlicher Rest über alle Courts des Vereins
)

rpc('claim_member_quota', { p_booking_id }) → TABLE (
  club_remaining integer, member_remaining integer   -- Restwerte NACH der Buchung
)
```

Anbieten nur wenn: `quota_enabled` **und** `club_remaining >= Dauer` **und**
`member_remaining >= Dauer` **und** die Buchung kostet noch etwas.

**Bewusst kein Automatismus.** Das Kontingent ist eine geteilte Ressource des Vereins — das Mitglied
entscheidet aktiv per Schalter. Lässt die App den Schalter weg, zahlt das Mitglied schlicht seinen
Mitgliederpreis; es bricht nichts.

Nach erfolgreichem `claim_member_quota` steht die Buchung auf 0 € → weiter über den Free-Path aus
Abschnitt 3.

Fehler kommen als Postgres-Exception mit sprechendem Code:

| Code | Bedeutung |
|---|---|
| `not_a_club_member` | Keinem Verein zugeordnet |
| `not_home_court` | Court gehört nicht zum eigenen Verein |
| `quota_not_enabled` | Verein hat das Kontingent nicht für Mitglieder freigegeben |
| `club_quota_exhausted` | Vereinskontingent für den Monat aufgebraucht |
| `member_quota_exhausted` | Persönlicher Anteil aufgebraucht |
| `tennis_already_free` | Heim-Tennis ist ohnehin kostenlos |
| `quota_already_used` | Buchung läuft bereits über das Kontingent |
| `booking_not_pending` | Buchung nicht mehr änderbar |
| `not_your_booking` | Fremde Buchung |

Web-Referenz mit deutschen Texten: `src/hooks/useBookingCheckout.ts`, Konstante `QUOTA_ERRORS`.

---

## 7 · Neue Spalten auf `bookings`

Für „Meine Buchungen" verfügbar, RLS unverändert (eigene Buchungen lesbar):

| Spalte | Bedeutung |
|---|---|
| `member_club_id` | Verein, dessen Kondition gegriffen hat (NULL = keine) |
| `member_scope` | `'home'` \| `'away'` \| NULL |
| `member_discount_cents` | tatsächlich gewährter Abzug in Cent |
| `is_free_allocation` | true = über Freikontingent gebucht (existierte schon) |
| `allocation_minutes` | verbrauchte Kontingent-Minuten (existierte schon) |

Damit lässt sich in der Buchungshistorie „Mitgliederpreis −12,00 €" bzw. „Freikontingent, 90 Min"
ausweisen. Der Externenpreis ist `price_cents + member_discount_cents`.

---

## 8 · Was sich NICHT ändert

- Buchungsanlage, Hold-Logik, `no_overlapping_bookings`, Stripe-Webhook: unverändert.
- **Storno weiterhin ausschließlich über `cancel-booking`.** Die Function gibt jetzt zusätzlich
  verbrauchte Kontingent-Minuten an den Verein zurück (idempotent). Ein direktes
  `UPDATE bookings SET status='cancelled'` würde diese Rückbuchung überspringen.
- Payback-Punkte bleiben dauerbasiert: nur Padel, nie bei `is_free_allocation`, nie bei Tennis.
- Gäste sind nie Mitglieder — der Gast-Pfad ist unberührt.
- Preisbänder gelten weiter; im Rabatt-Modus rechnet die Kondition auf den *Band*-Preis. Nur der
  Festpreis-Modus schlägt Bänder vollständig.

---

## 9 · Nicht im App-Scope

Die Mitgliederverwaltung (Einladen, Mitgliederliste mit Buchungsvolumen, Konditionen) liegt im
**Club-Portal** und im **Admin** — beides Web. Die RPCs `invite_club_members`,
`club_member_overview`, `remove_club_member`, `revoke_club_member_invite` und
`club_court_bookings` braucht die App nicht.

---

## 10 · Checkliste

- [ ] `resolve_booking_rate` / `_batch` ohne `p_user_id` aufrufen, `price_cents` unverändert übernehmen
- [ ] Durchgestrichenen `base_price_cents` anzeigen, wenn `member_discount_cents > 0`
- [ ] `price_cents === 0` als „kostenlos" rendern
- [ ] **`create-payment-intent` auf `free: true` prüfen** → `create-checkout-session` statt PaymentSheet
- [ ] **`claim_club_member_invites()` einmal pro Session nach Login**
- [ ] `my_club_membership()` für Vereins- und Limit-Hinweis
- [ ] optional: Freikontingent-Schalter über `member_quota_summary` + `claim_member_quota`
- [ ] Buchungshistorie: Mitgliederrabatt bzw. Freikontingent ausweisen
