-- =============================================================================
-- PUSH CONSENT & CATEGORY SPLIT (July 2026, REQ-D09)
-- Every notifications INSERT previously fanned out to a device push with no
-- marketing/transactional distinction and no opt-in. This adds:
--   1. notifications.category ('transactional' default | 'marketing')
--   2. profiles.push_marketing_opt_in (default FALSE — opt-in, § 7 UWG)
--   3. notify_push() only pushes marketing notifications to opted-in users.
--      The in-app notification row itself is always created (pull medium).
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_marketing_opt_in boolean NOT NULL DEFAULT false;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'transactional';

DO $chk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_category_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_category_check
      CHECK (category IN ('transactional', 'marketing'));
  END IF;
END;
$chk$;

CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_push$
DECLARE
  v_secret text := current_setting('app.cron_secret', true);
  v_opt_in boolean;
BEGIN
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RETURN NEW; -- push not activated yet — in-app notification still works
  END IF;

  -- Marketing pushes are strictly opt-in (§ 7 UWG); transactional ones pass.
  IF NEW.category = 'marketing' THEN
    SELECT push_marketing_opt_in INTO v_opt_in
    FROM public.profiles WHERE user_id = NEW.user_id;
    IF NOT COALESCE(v_opt_in, false) THEN
      RETURN NEW;
    END IF;
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
    RAISE NOTICE 'notify_push failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$notify_push$;
