-- 1. Fix newsletter_subscribers: restrict INSERT to authenticated users only
-- First drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;

-- Check existing policies and drop all INSERT ones
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'newsletter_subscribers' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.newsletter_subscribers', pol.policyname);
  END LOOP;
END $$;

-- Create a restrictive INSERT policy requiring authentication
CREATE POLICY "Authenticated users can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Protect referral_code from being changed once set
CREATE OR REPLACE FUNCTION public.protect_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.referral_code IS NOT NULL AND NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Referral code cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_referral_code_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_referral_code();

-- 3. Add constraints for skill_self_rating and games_played_self
ALTER TABLE public.profiles
ADD CONSTRAINT skill_self_rating_range 
CHECK (skill_self_rating IS NULL OR (skill_self_rating >= 1 AND skill_self_rating <= 10));

ALTER TABLE public.profiles
ADD CONSTRAINT games_played_self_non_negative
CHECK (games_played_self IS NULL OR games_played_self >= 0);