-- Push notifications for the mobile app (HANDOFF §3.6.2).
--
-- 1) device_tokens: the app upserts its Expo push token after login (own-row RLS).
-- 2) AFTER INSERT trigger on public.notifications -> pg_net POST to the push-notify edge
--    function, so EVERY in-app notification also fires a push — no changes needed in the
--    individual notification creators (lobby-api, friends-api, rewards-trigger, ...).
--
-- Auth reuses the existing app.cron_secret database setting (same secret as the
-- CRON_SECRET function secret — already set up for punctual booking reminders). If it is
-- unset, the trigger is a silent no-op; notification inserts NEVER fail because of push.
--
-- REQUIRES: pg_net (already required by punctual_booking_reminders).
-- DEPLOY: supabase functions deploy push-notify (see docs in the app repo).

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own tokens" ON public.device_tokens;
CREATE POLICY "own tokens" ON public.device_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON public.device_tokens (user_id);

-- Trigger: fan every notifications insert out to push-notify.
CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_push$
DECLARE
  v_secret text := current_setting('app.cron_secret', true);
BEGIN
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RETURN NEW; -- push not activated yet — in-app notification still works
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := 'https://wvvdkuextsbsecqbfksb.supabase.co/functions/v1/push-notify',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || v_secret
                 ),
      body    := jsonb_build_object(
                   'user_id', NEW.user_id,
                   'title',   NEW.title,
                   'body',    NEW.message,
                   'data',    COALESCE(NEW.metadata, '{}'::jsonb)
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never let a push failure break creating the notification itself.
    RAISE NOTICE 'notify_push failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$notify_push$;

DROP TRIGGER IF EXISTS notifications_push ON public.notifications;
CREATE TRIGGER notifications_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push();
