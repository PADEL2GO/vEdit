-- Create rate_limit_log table for tracking API rate limits
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient rate limit queries
CREATE INDEX idx_rate_limit_log_lookup ON public.rate_limit_log (ip_address, action, created_at);

-- Enable RLS on rate_limit_log (service role bypasses RLS for edge functions)
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- No policies needed as only edge functions with service role access this table
-- Create a cleanup function to remove old entries (optional, run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limit_log 
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;