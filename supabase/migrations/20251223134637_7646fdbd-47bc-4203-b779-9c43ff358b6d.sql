-- Add new reward definitions for DAILY_LOGIN and INSTAGRAM_TAG
INSERT INTO public.reward_definitions (key, title, description, category, points_rule, lock_policy, caps, is_active)
VALUES 
  ('DAILY_LOGIN', 'Täglicher Login', 'Einmal täglich Credits für den Login in die App', 'loyalty_retention', 
   '{"type": "fixed", "value": 5}'::jsonb, 
   '{"available_when": "immediate"}'::jsonb, 
   '{"daily_max": 1}'::jsonb, 
   true),
  ('INSTAGRAM_TAG', 'Instagram Erwähnung', 'Tagge uns in deiner Story und erhalte Credits', 'engagement_quality', 
   '{"type": "fixed", "value": 30}'::jsonb, 
   '{"available_when": "immediate"}'::jsonb, 
   '{"monthly_max": 4}'::jsonb, 
   true)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  points_rule = EXCLUDED.points_rule,
  lock_policy = EXCLUDED.lock_policy,
  caps = EXCLUDED.caps,
  is_active = EXCLUDED.is_active;