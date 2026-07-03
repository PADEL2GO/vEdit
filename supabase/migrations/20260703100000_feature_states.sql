-- 3-state feature visibility on site_settings: 'visible' (everyone),
-- 'demo' (admins only), 'hidden' (nobody). One column per managed feature.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS feature_lobbies_state text NOT NULL DEFAULT 'hidden' CHECK (feature_lobbies_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_league_state text NOT NULL DEFAULT 'hidden' CHECK (feature_league_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_events_state text NOT NULL DEFAULT 'hidden' CHECK (feature_events_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_rewards_state text NOT NULL DEFAULT 'hidden' CHECK (feature_rewards_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_matching_state text NOT NULL DEFAULT 'hidden' CHECK (feature_matching_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_p2g_state text NOT NULL DEFAULT 'hidden' CHECK (feature_p2g_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_marketplace_state text NOT NULL DEFAULT 'hidden' CHECK (feature_marketplace_state IN ('visible','demo','hidden')),
  ADD COLUMN IF NOT EXISTS feature_friends_state text NOT NULL DEFAULT 'hidden' CHECK (feature_friends_state IN ('visible','demo','hidden'));

UPDATE public.site_settings
SET feature_events_state = 'visible',
    feature_friends_state = 'visible',
    feature_marketplace_state = 'visible',
    feature_p2g_state = 'visible'
WHERE id = 'global';
