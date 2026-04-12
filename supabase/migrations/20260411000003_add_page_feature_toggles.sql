-- Add per-page feature toggles for Marketplace, Rewards, and Friends
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS feature_marketplace_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_marketplace_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS feature_rewards_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_rewards_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS feature_friends_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_friends_updated_at timestamptz;
