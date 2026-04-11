-- Add global launch toggle to site_settings
-- When false (default): logged-in users can only access /booking and /account
-- When true: all features are accessible (subject to individual feature flags)
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS feature_app_launched boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_app_launched_updated_at timestamptz;
