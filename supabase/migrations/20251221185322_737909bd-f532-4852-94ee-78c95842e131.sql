-- Add timestamp columns to track when locks were last activated
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS pin_lock_vereine_activated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS pin_lock_partner_activated_at TIMESTAMP WITH TIME ZONE DEFAULT now();