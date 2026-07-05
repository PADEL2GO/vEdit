-- Globales Launch-Datum (im Admin → Features pflegbar). Treibt den Homepage-Countdown
-- und alle "Coming Soon"-Placeholder (z. B. Events, wenn noch keine angelegt sind).
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS launch_date timestamptz DEFAULT '2026-07-01T00:00:00Z';
