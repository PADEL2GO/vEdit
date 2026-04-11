-- Add new fields to reward_definitions for better reward control
-- awarding_mode: AUTO_CLAIM (instant credit) vs USER_CLAIM (user must claim)
-- approval_required: true for rewards needing admin review
-- display_rule_text: human-readable explanation

ALTER TABLE public.reward_definitions
ADD COLUMN IF NOT EXISTS awarding_mode text NOT NULL DEFAULT 'USER_CLAIM' CHECK (awarding_mode IN ('AUTO_CLAIM', 'USER_CLAIM')),
ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS display_rule_text text;

-- Add PENDING_APPROVAL and REJECTED status support (for tracking in reward_instances)
-- Note: status is already text type so we just need to use these values

-- Update existing booking-related definitions to AUTO_CLAIM
UPDATE public.reward_definitions
SET awarding_mode = 'AUTO_CLAIM',
    display_rule_text = CASE 
      WHEN key = 'BOOKING_PAID' THEN 'Automatisch nach erfolgreicher Buchung gutgeschrieben'
      WHEN key = 'FIRST_BOOKING_BONUS' THEN 'Einmalig bei deiner ersten Buchung'
      WHEN key = 'EARLY_BIRD' THEN 'Bei Buchung mindestens 7 Tage im Voraus'
      WHEN key = 'OFFPEAK_BONUS' THEN 'Bei Buchungen vor 10 Uhr oder nach 20 Uhr'
      ELSE display_rule_text
    END
WHERE key IN ('BOOKING_PAID', 'FIRST_BOOKING_BONUS', 'EARLY_BIRD', 'OFFPEAK_BONUS');

-- Update profile/verification rewards to AUTO_CLAIM
UPDATE public.reward_definitions
SET awarding_mode = 'AUTO_CLAIM',
    display_rule_text = CASE 
      WHEN key = 'PROFILE_COMPLETED' THEN 'Automatisch nach Vervollständigung deines Profils'
      WHEN key = 'EMAIL_VERIFIED' THEN 'Automatisch nach E-Mail-Verifizierung'
      ELSE display_rule_text
    END
WHERE key IN ('PROFILE_COMPLETED', 'EMAIL_VERIFIED');

-- Update Instagram tag to require approval
UPDATE public.reward_definitions
SET approval_required = true,
    awarding_mode = 'USER_CLAIM',
    display_rule_text = 'Nach Prüfung deines Instagram-Posts durch unser Team'
WHERE key = 'INSTAGRAM_TAG';

-- Update referral rewards
UPDATE public.reward_definitions
SET awarding_mode = 'AUTO_CLAIM',
    display_rule_text = CASE 
      WHEN key = 'REFERRAL_SIGNUP' THEN 'Automatisch wenn dein Freund sich registriert und verifiziert'
      WHEN key = 'REFERRAL_FIRST_BOOKING' THEN 'Automatisch wenn dein Freund erstmals bucht'
      ELSE display_rule_text
    END
WHERE key IN ('REFERRAL_SIGNUP', 'REFERRAL_FIRST_BOOKING');

-- Add comment explaining the new fields
COMMENT ON COLUMN public.reward_definitions.awarding_mode IS 'AUTO_CLAIM: Credits sofort gutgeschrieben; USER_CLAIM: User muss explizit einlösen';
COMMENT ON COLUMN public.reward_definitions.approval_required IS 'true wenn Admin-Freigabe vor Gutschrift nötig (z.B. Instagram-Posts)';
COMMENT ON COLUMN public.reward_definitions.display_rule_text IS 'Benutzerfreundliche Erklärung für Frontend-Anzeige';