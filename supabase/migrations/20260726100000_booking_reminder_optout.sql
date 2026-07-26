-- Per-user opt-out for booking reminders (app "Buchungserinnerung" toggle; own-row RLS
-- update already allowed on profiles). send-match-reminders checks this before sending
-- the reminder e-mail / in-app notification. Default false = everyone keeps reminders.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_reminder_opt_out boolean NOT NULL DEFAULT false;
