-- =============================================================================
-- P2G REWARDS SYSTEM - COMPLETE DATABASE SCHEMA
-- =============================================================================

-- 1) REWARD DEFINITIONS TABLE
-- Stores all reward types with their rules, caps, and lock policies
CREATE TABLE public.reward_definitions (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('booking_revenue', 'referral_growth', 'engagement_quality', 'loyalty_retention')),
  title TEXT NOT NULL,
  description TEXT,
  points_rule JSONB NOT NULL DEFAULT '{"type": "fixed", "value": 0}',
  lock_policy JSONB DEFAULT '{"available_when": "immediate"}',
  caps JSONB DEFAULT '{}',
  expiry_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) REWARD INSTANCES TABLE
-- Each earned reward for a user
CREATE TABLE public.reward_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  definition_key TEXT NOT NULL REFERENCES public.reward_definitions(key),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AVAILABLE', 'CLAIMED', 'REVERSED', 'EXPIRED')),
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  available_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(definition_key, source_type, source_id)
);

-- 3) POINTS LEDGER TABLE
-- Immutable audit log of all balance changes (the ONLY source of truth for balance)
CREATE TABLE public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reward_instance_id UUID REFERENCES public.reward_instances(id),
  delta_points INTEGER NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('EARN_CLAIM', 'REVERSAL', 'ADMIN_ADJUST', 'MARKETPLACE_REDEEM')),
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REWARD_EARNED', 'REWARD_AVAILABLE', 'REWARD_CLAIMED', 'REWARD_REVERSED', 'REWARD_EXPIRED', 'REFERRAL_SIGNUP', 'REFERRAL_BOOKING', 'SYSTEM')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_url TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5) REFERRAL ATTRIBUTIONS TABLE
CREATE TABLE public.referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  referred_user_id UUID UNIQUE NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  signup_completed_at TIMESTAMPTZ DEFAULT now(),
  first_booking_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6) ADD REFERRAL CODE TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX idx_reward_instances_user_status ON public.reward_instances(user_id, status);
CREATE INDEX idx_reward_instances_source ON public.reward_instances(source_type, source_id);
CREATE INDEX idx_points_ledger_user ON public.points_ledger(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_referral_attributions_referrer ON public.referral_attributions(referrer_user_id);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================
ALTER TABLE public.reward_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- reward_definitions: Anyone can read, only admins can manage
CREATE POLICY "Anyone can view active reward definitions" ON public.reward_definitions
FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reward definitions" ON public.reward_definitions
FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- reward_instances: Users see only their own
CREATE POLICY "Users can view own reward instances" ON public.reward_instances
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reward instances" ON public.reward_instances
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- points_ledger: Users see only their own
CREATE POLICY "Users can view own points ledger" ON public.points_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points ledger" ON public.points_ledger
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- notifications: Users can view and update (mark read) their own
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" ON public.notifications
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- referral_attributions: Users can see where they referred or were referred
CREATE POLICY "Users can view own referral attributions" ON public.referral_attributions
FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Admins can view all referral attributions" ON public.referral_attributions
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- =============================================================================
-- SEED REWARD DEFINITIONS
-- =============================================================================
INSERT INTO public.reward_definitions (key, category, title, description, points_rule, lock_policy, caps, is_active) VALUES
-- BOOKING/REVENUE
('BOOKING_PAID', 'booking_revenue', 'Buchungs-Bonus', 'Erhalte 10% des Buchungspreises als Credits', 
  '{"type": "percentage", "value": 10, "base_field": "price_cents", "divisor": 100}', 
  '{"available_when": "booking_completed"}', '{}', true),

('FIRST_BOOKING_BONUS', 'booking_revenue', 'Erste Buchung', 'Willkommensbonus für deine erste Buchung', 
  '{"type": "fixed", "value": 50}', 
  '{"available_when": "booking_completed"}', '{"total_max": 1}', true),

('OFFPEAK_BONUS', 'booking_revenue', 'Off-Peak Bonus', 'Extra Credits für Buchungen außerhalb der Stoßzeiten', 
  '{"type": "fixed", "value": 20}', 
  '{"available_when": "booking_completed"}', '{}', true),

('EARLY_BIRD', 'booking_revenue', 'Early Bird', 'Bonus für Buchungen mindestens 7 Tage im Voraus', 
  '{"type": "fixed", "value": 15}', 
  '{"available_when": "booking_completed"}', '{}', true),

('GROUP_BOOKING', 'booking_revenue', 'Gruppen-Bonus', 'Bonus für Buchungen mit mehreren Spielern', 
  '{"type": "fixed", "value": 25}', 
  '{"available_when": "booking_completed"}', '{}', true),

-- REFERRAL/GROWTH
('REFERRAL_SIGNUP', 'referral_growth', 'Freund eingeladen', 'Erhalte Credits wenn sich ein Freund registriert', 
  '{"type": "fixed", "value": 25}', 
  '{"available_when": "email_verified"}', '{"monthly_max": 10}', true),

('REFERRAL_FIRST_BOOKING', 'referral_growth', 'Freund hat gebucht', 'Erhalte Credits wenn dein Freund seine erste Buchung macht', 
  '{"type": "fixed", "value": 50}', 
  '{"available_when": "booking_completed"}', '{"monthly_max": 10}', true),

-- ENGAGEMENT/QUALITY
('PROFILE_COMPLETED', 'engagement_quality', 'Profil vollständig', 'Einmaliger Bonus für ein vollständiges Profil', 
  '{"type": "fixed", "value": 20}', 
  '{"available_when": "immediate"}', '{"total_max": 1}', true),

('EMAIL_VERIFIED', 'engagement_quality', 'E-Mail verifiziert', 'Bonus für verifizierte E-Mail-Adresse', 
  '{"type": "fixed", "value": 10}', 
  '{"available_when": "immediate"}', '{"total_max": 1}', true),

('REVIEW_AFTER_PLAY', 'engagement_quality', 'Bewertung abgegeben', 'Credits für eine Bewertung nach dem Spiel', 
  '{"type": "fixed", "value": 10}', 
  '{"available_when": "immediate"}', '{"monthly_max": 5}', true),

-- LOYALTY/RETENTION
('STREAK_3_BOOKINGS', 'loyalty_retention', 'Aktiver Spieler', 'Bonus für 3 Buchungen in 30 Tagen', 
  '{"type": "fixed", "value": 30}', 
  '{"available_when": "immediate"}', '{"monthly_max": 1}', true),

('MONTHLY_ACTIVE_BONUS', 'loyalty_retention', 'Monatlich aktiv', 'Bonus für mindestens eine Buchung im Monat', 
  '{"type": "fixed", "value": 15}', 
  '{"available_when": "immediate"}', '{"monthly_max": 1}', true)

ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- FUNCTION: Calculate user's current balance from ledger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_rewards_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta_points), 0)::INTEGER
  FROM public.points_ledger
  WHERE user_id = p_user_id
$$;

-- =============================================================================
-- FUNCTION: Generate unique referral code
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := upper(substr(md5(random()::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code on profile insert/update
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER generate_referral_code_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();