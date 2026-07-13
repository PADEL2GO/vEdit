# Deployment-Checkliste — Buchungsbestätigung + pünktliche Reminder (2026-07-13)

Nach dem Merge nach `main` sind Code + Migrationen im Repo, aber **Edge-Functions und
Migrationen deployen sich NICHT über Vercel**. Bitte die folgenden Schritte im
Supabase-Projekt `wvvdkuextsbsecqbfksb` abarbeiten. Reihenfolge einhalten.

---

## Schritt 0 (WICHTIGSTE Ursache zuerst): Stripe-Webhook prüfen

Die Bestätigungs-Mail für **bezahlte** Buchungen hängt am Stripe-Webhook. Wenn der nicht
feuert, wird die Buchung nicht `confirmed` und es kommt keine Mail.

1. Stripe-Dashboard → **Developers → Webhooks**.
2. Es muss ein Endpoint auf diese URL existieren:
   `https://wvvdkuextsbsecqbfksb.supabase.co/functions/v1/stripe-webhook`
3. Beim Endpoint muss das Event **`checkout.session.completed`** aktiviert sein.
4. Der **Signing secret** des Endpoints (`whsec_…`) muss als Supabase-Function-Secret
   `STRIPE_WEBHOOK_SECRET` hinterlegt sein (Supabase → Edge Functions → Secrets).

**Schnelltest:** eine Testbuchung bezahlen und danach in der DB schauen:
```sql
select id, status, confirmation_sent_at, created_at
from public.bookings
order by created_at desc
limit 5;
```
- Bleibt `status` auf `pending_payment` → **Webhook feuert nicht** (Schritt 0 fixen).
- Wird `status = confirmed`, aber `confirmation_sent_at` bleibt `NULL` → Webhook feuert,
  aber die Mail-Function scheitert → Ursache steht ab jetzt im Log (Schritt 5).

---

## Schritt 1: Migrationen ausführen (SQL-Editor)

Beide Dateien im Supabase **SQL-Editor** ausführen (Inhalt aus dem Repo kopieren):

1. `supabase/migrations/20260713120000_booking_confirmation_idempotency.sql`
   (fügt Spalte `bookings.confirmation_sent_at` hinzu)
2. `supabase/migrations/20260713120100_punctual_booking_reminders.sql`
   (legt `trigger_match_reminders()` + pg_cron-Job an)

---

## Schritt 2: Edge-Functions deployen

Mit der Supabase-CLI (eingeloggt), im Projektordner:
```bash
supabase functions deploy send-booking-confirmation --project-ref wvvdkuextsbsecqbfksb
supabase functions deploy stripe-webhook            --project-ref wvvdkuextsbsecqbfksb
supabase functions deploy create-checkout-session   --project-ref wvvdkuextsbsecqbfksb
```

---

## Schritt 3: Pünktliche Reminder scharf schalten (Bug 2)

1. **pg_net aktivieren** (falls noch nicht): Supabase → **Database → Extensions** →
   nach `pg_net` suchen → aktivieren. (`pg_cron` ist bereits aktiv.)
2. **Secret für den Cron-Aufruf setzen** — im SQL-Editor, denselben Wert wie das
   `CRON_SECRET`-Function-Secret einsetzen:
   ```sql
   ALTER DATABASE postgres SET app.cron_secret = 'HIER_DENSELBEN_WERT_WIE_CRON_SECRET';
   ```
   Danach **einmal neu verbinden** (SQL-Editor-Tab neu laden), damit die Einstellung greift.
3. **Prüfen**, dass der Job läuft:
   ```sql
   select jobname, schedule, active from cron.job where jobname = 'trigger-match-reminders';
   -- nach ein paar Minuten:
   select status, return_message, start_time
   from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = 'trigger-match-reminders')
   order by start_time desc limit 5;
   ```
   `status = succeeded` = gut. Bei `failed` steht der Grund in `return_message`
   (häufig: `app.cron_secret` nicht gesetzt → Schritt 3.2, oder `pg_net` nicht aktiv → 3.1).

> Der GitHub-Actions-Cron bleibt als Fallback aktiv. Wenn die pg_cron-Reminder ein paar
> Tage sauber laufen, kannst du `.github/workflows/booking-reminders.yml` löschen.

---

## Schritt 4: Verifizieren

1. **Bestätigung:** eine Testbuchung bezahlen → Mail sollte kommen. Falls nicht:
   Supabase → **Edge Functions → send-booking-confirmation → Logs** (und `stripe-webhook`
   → Logs). Der Grund steht jetzt im Klartext, z. B.:
   - `Unauthorized call rejected` → Service-Key-Mismatch
   - `RESEND_API_KEY is not configured` → Resend-Key für diese Function fehlt
   - `Resend send failed: …` → Resend/Domain
   - **`Owner confirmation FAILED { status: 401/500, body: … }`** im `stripe-webhook`-Log
     → zeigt exakt, was die Mail-Function zurückgab
   - `send-booking-confirmation` taucht gar nicht auf → Webhook erreicht sie nicht (Schritt 0)
2. **Reminder:** eine bestätigte Buchung ~1 h in die Zukunft legen und prüfen, dass die
   Erinnerung ~1 h vorher kommt. `reminder_sent_at` wird dabei gesetzt.

---

## Rollback (falls nötig)

- Migrationen sind additiv (nur eine neue Spalte + eine neue Function/Cron-Job) — kein
  Datenverlust. Cron-Job entfernen: `select cron.unschedule('trigger-match-reminders');`
- Function-Rollback: vorige Version erneut deployen (Git-Historie).
