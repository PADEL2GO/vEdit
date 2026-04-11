-- Fix 1: Add explicit admin-only policy on rate_limit_log
CREATE POLICY "Only admins can view rate limits"
ON public.rate_limit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Add salt column to camera_api_keys for salted hashing
ALTER TABLE public.camera_api_keys ADD COLUMN salt TEXT;