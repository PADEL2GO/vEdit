-- Create site_settings table for global settings like PIN locks
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  pin_lock_vereine BOOLEAN NOT NULL DEFAULT true,
  pin_lock_partner BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Insert default row
INSERT INTO public.site_settings (id) VALUES ('global');

-- Policies: Anyone can read, only admins can update
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update site settings" 
ON public.site_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));