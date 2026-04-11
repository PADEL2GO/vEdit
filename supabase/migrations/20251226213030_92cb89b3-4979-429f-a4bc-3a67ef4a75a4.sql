-- =====================================================
-- PHASE 1: Consolidate Reward Definitions to 4 Main Types
-- =====================================================

-- 1. Deactivate all reward definitions except the 4 main types
UPDATE reward_definitions 
SET is_active = false 
WHERE key NOT IN ('BOOKING_PAID', 'DAILY_LOGIN', 'INSTAGRAM_TAG', 'REFERRAL_SIGNUP');

-- 2. Update BOOKING_PAID to BOOKING_PAYBACK configuration
UPDATE reward_definitions 
SET 
  title = 'Buchungs-Payback',
  description = '10% deines Buchungspreises als Credits zurück',
  display_rule_text = '10% Payback auf jede Buchung',
  awarding_mode = 'AUTO_CLAIM',
  approval_required = false,
  points_rule = '{"type": "percentage", "value": 10, "divisor": 100}'::jsonb,
  caps = '{}'::jsonb,
  lock_policy = '{"available_when": "immediate"}'::jsonb
WHERE key = 'BOOKING_PAID';

-- 3. Update DAILY_LOGIN with streak tracking configuration
UPDATE reward_definitions 
SET 
  title = 'Täglicher Login',
  description = 'Jeden Tag einloggen und Credits sammeln',
  display_rule_text = '+5 Credits täglich, Streak-Bonus möglich',
  awarding_mode = 'USER_CLAIM',
  approval_required = false,
  points_rule = '{"type": "fixed", "value": 5}'::jsonb,
  caps = '{"daily_max": 1}'::jsonb,
  lock_policy = '{"available_when": "immediate"}'::jsonb
WHERE key = 'DAILY_LOGIN';

-- 4. Update INSTAGRAM_TAG with approval requirement
UPDATE reward_definitions 
SET 
  title = 'Social Media Tag',
  description = 'Tagge @padel2go auf Instagram',
  display_rule_text = '+30 Credits pro Post (max 4/Monat)',
  awarding_mode = 'USER_CLAIM',
  approval_required = true,
  points_rule = '{"type": "fixed", "value": 30}'::jsonb,
  caps = '{"monthly_max": 4}'::jsonb,
  lock_policy = '{"available_when": "immediate"}'::jsonb
WHERE key = 'INSTAGRAM_TAG';

-- 5. Update REFERRAL_SIGNUP configuration
UPDATE reward_definitions 
SET 
  title = 'Freunde einladen',
  description = 'Teile deinen Referral-Link und verdiene Credits',
  display_rule_text = '+25 Credits wenn sich jemand anmeldet',
  awarding_mode = 'AUTO_CLAIM',
  approval_required = false,
  points_rule = '{"type": "fixed", "value": 25}'::jsonb,
  caps = '{"monthly_max": 10}'::jsonb,
  lock_policy = '{"available_when": "immediate"}'::jsonb
WHERE key = 'REFERRAL_SIGNUP';

-- 6. Create user_streaks table for tracking login and booking streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  streak_type text NOT NULL, -- 'DAILY_LOGIN' or 'WEEKLY_BOOKING'
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_qualified_date text, -- YYYY-MM-DD for daily, YYYY-Www for weekly
  last_bonus_milestone integer, -- Last bonus awarded (7, 14, 30 for login; 4, 10, 26 for booking)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all streaks" ON public.user_streaks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();