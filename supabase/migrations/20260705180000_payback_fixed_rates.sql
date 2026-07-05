-- =============================================================================
-- Payback rework: fixed points per booking length (60 vs 120 min) instead of
-- per-hour. Admin-configurable; the expert-level multiplier still applies; no
-- payback when a voucher is used (enforced in the edge functions).
-- Also: kill the first-booking bonus for all users.
-- =============================================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payback_points_60min integer NOT NULL DEFAULT 100;
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payback_points_120min integer NOT NULL DEFAULT 200;

-- Remove the first-booking bonus everywhere: deactivating the reward definition is
-- the authoritative kill switch (getDefinition filters on is_active = true).
UPDATE public.reward_definitions
SET is_active = false
WHERE key = 'FIRST_BOOKING_BONUS';
