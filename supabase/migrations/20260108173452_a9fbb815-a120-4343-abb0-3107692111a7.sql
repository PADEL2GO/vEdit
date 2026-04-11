-- Create admin_broadcasts table for logging sent admin messages
CREATE TABLE public.admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'specific')),
  target_user_ids UUID[],
  recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Only admins can view broadcasts
CREATE POLICY "Admins can view all broadcasts"
ON public.admin_broadcasts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert broadcasts
CREATE POLICY "Admins can insert broadcasts"
ON public.admin_broadcasts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add index for faster queries
CREATE INDEX idx_admin_broadcasts_created_at ON public.admin_broadcasts(created_at DESC);