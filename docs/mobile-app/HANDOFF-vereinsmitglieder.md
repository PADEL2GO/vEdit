# Handoff: Vereinsmitglieder (Mitgliederpreise & Freikontingent)

**Stand:** 2026-08-14 · Design: `docs/superpowers/specs/2026-08-14-vereinsmitglieder-design.md`

Für die iOS-App relevant, weil sich **Preise und der Bezahlpfad ändern können**, ohne dass die App
etwas davon weiß.

## Was neu ist

Ein Nutzer kann Mitglied genau eines Vereins sein (`club_memberships`). Daraus folgt:

| Court | Padel | Tennis |
|---|---|---|
| Heimatverein | vereinbarte Kondition (€-Abzug oder Festpreis) | **0 €** |
| Fremder Court | Externenpreis − fixer €-Abzug | Externenpreis |

Zusätzlich kann ein Mitglied — falls der Verein es freigegeben hat — auf Heim-Padel-Courts das
Vereins-Freikontingent nutzen (Preis 0 €).

## Was die App anpassen muss

### 1. `resolve_booking_rate` / `resolve_booking_rates_batch` liefern mehr Spalten

`price_cents` ist weiterhin **der zu zahlende Preis** — jetzt inklusive Mitglieder-Kondition.
Neu dazu:

- `base_price_cents` — Externenpreis vor Kondition (für die durchgestrichene Anzeige)
- `member_scope` — `'home'` | `'away'` | `null`
- `member_discount_cents` — tatsächlich gewährter Abzug
- `member_limit_remaining` — verbleibende vergünstigte Buchungen im Monat (`null` = unbegrenzt)

Die Funktionen nutzen `auth.uid()`. Ruft die App sie mit dem User-JWT auf, stimmt der Preis
automatisch. Ein explizit übergebenes `p_user_id` wird **nur** von der Service-Rolle akzeptiert.

### 2. `create-payment-intent` kann jetzt `{ free: true }` zurückgeben

Kostet die Buchung 0 € (Heim-Tennis eines Mitglieds oder Freikontingent), gibt es nichts zu
kassieren und es wird **kein PaymentIntent erzeugt**:

```json
{ "free": true, "amount_cents": 0, "publishable_key": "pk_..." }
```

Die App darf in diesem Fall das PaymentSheet **nicht** öffnen, sondern ruft
`create-checkout-session` mit derselben `booking_id` auf. Deren Free-Path bestätigt die Buchung,
verrechnet die Reserven und verschickt die Bestätigungsmail; sie antwortet mit
`{ url: null, free: true }`.

Ohne diese Anpassung würde die App auf eine 0-€-Buchung den Stripe-Mindestbetrag von 50 Cent
abrechnen.

### 3. Freikontingent (optional, kann nachgezogen werden)

- `member_quota_summary(p_court_id, p_start)` → `club_remaining`, `member_remaining` (Minuten)
- `claim_member_quota(p_booking_id)` → setzt die Buchung auf 0 € und bucht die Minuten ab

Bewusst **kein Automatismus**: das Mitglied entscheidet aktiv, weil das Kontingent geteilt wird.
Lässt die App den Schalter weg, zahlt das Mitglied schlicht seinen Mitgliederpreis — nichts bricht.

### 4. `my_club_membership()` für die Anzeige

Liefert Verein, Konditionen und `discount_used_month` / `monthly_discount_limit` — genug für einen
Hinweis wie „Noch 3 von 8 vergünstigten Buchungen diesen Monat".

## Was sich NICHT ändert

- Buchungsanlage, Hold-Logik, Storno und Webhook-Pfade bleiben identisch.
- Payback-Punkte bleiben dauerbasiert: nur Padel, nie bei `is_free_allocation`.
- Gäste sind nie Mitglieder — der Gast-Pfad ist unberührt.
