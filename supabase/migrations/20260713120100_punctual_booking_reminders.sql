-- Punctual booking reminders via pg_cron + pg_net.
--
-- WHY: the T-1h reminder was triggered only by GitHub Actions (.github/workflows/
-- booking-reminders.yml, */10). GitHub's scheduled crons are best-effort and are
-- frequently delayed 5–30 min (worst at the top of the hour) or skipped, and because
-- send-match-reminders claims each booking on the FIRST run that catches it
-- (reminder_sent_at), that delay is exactly what the user receives — the reminder
-- arrives late, or (if the run slips past the booking start) not at all.
--
-- FIX: also drive the same function from pg_cron every 2 minutes, which fires punctually
-- (DB-native, not GitHub's best-effort scheduler). The GitHub workflow is LEFT IN PLACE
-- as a fallback — send-match-reminders is idempotent (atomic reminder_sent_at claim), so
-- both sources triggering is harmless: whichever fires first claims each booking.
--
-- MANUAL STEP (once, in the Supabase SQL editor) — store the same secret the function
-- expects (its CRON_SECRET function-secret) so the cron call can authenticate:
--     ALTER DATABASE postgres SET app.cron_secret = '<same value as the CRON_SECRET edge-function secret>';
-- Then reconnect. If it is left unset, the pg_cron call simply gets 401 and the GitHub
-- fallback still delivers (just not as punctually) — so this migration is safe to run
-- before the secret is set.
--
-- REQUIRES: pg_cron and pg_net extensions (Database → Extensions). pg_cron is already
-- used by cleanup_expired_bookings; enable pg_net if it is not on yet.

CREATE OR REPLACE FUNCTION public.trigger_match_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $trigger_match_reminders$
DECLARE
  v_secret text := current_setting('app.cron_secret', true);
BEGIN
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE NOTICE 'app.cron_secret not set — skipping pg_cron reminder trigger (GitHub fallback still runs)';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://wvvdkuextsbsecqbfksb.supabase.co/functions/v1/send-match-reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_secret
               ),
    body    := '{}'::jsonb
  );
END;
$trigger_match_reminders$;

REVOKE ALL ON FUNCTION public.trigger_match_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_match_reminders() TO service_role;

-- Schedule every 2 minutes, only if pg_cron is available (so this migration does not
-- fail on a project without the extension).
DO $cron_setup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trigger-match-reminders') THEN
      PERFORM cron.unschedule('trigger-match-reminders');
    END IF;
    PERFORM cron.schedule(
      'trigger-match-reminders',
      '*/2 * * * *',
      'SELECT public.trigger_match_reminders()'
    );
  END IF;
END
$cron_setup$;
