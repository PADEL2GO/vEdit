ALTER TABLE public.site_settings
  ADD COLUMN feature_p2g_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN feature_p2g_updated_at timestamptz;