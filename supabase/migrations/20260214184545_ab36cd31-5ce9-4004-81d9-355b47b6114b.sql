ALTER TABLE public.site_settings
  ADD COLUMN feature_league_enabled BOOLEAN DEFAULT false,
  ADD COLUMN feature_league_updated_at TIMESTAMPTZ;