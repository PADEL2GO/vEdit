-- Add feature toggle columns to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS feature_lobbies_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_matching_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_lobbies_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feature_matching_updated_at TIMESTAMPTZ;

-- Update existing global row with default values
UPDATE public.site_settings 
SET 
  feature_lobbies_enabled = false,
  feature_matching_enabled = false
WHERE id = 'global';