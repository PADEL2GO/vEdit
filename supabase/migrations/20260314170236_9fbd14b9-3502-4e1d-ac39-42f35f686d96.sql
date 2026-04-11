ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS feature_events_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_events_updated_at timestamp with time zone;