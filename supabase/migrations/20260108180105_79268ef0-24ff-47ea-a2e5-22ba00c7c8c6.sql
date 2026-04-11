-- Add expires_at and updated_at to admin_broadcasts
ALTER TABLE public.admin_broadcasts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add broadcast_id and expires_at to notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS broadcast_id UUID REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

-- Create index for faster expiration queries
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_expires_at ON public.admin_broadcasts(expires_at) WHERE expires_at IS NOT NULL;

-- Create cleanup function for expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Delete expired notifications (this will also clean up broadcasts due to CASCADE if all notifications are gone)
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Also delete broadcasts that have expired (even if they had no notifications left)
  DELETE FROM public.admin_broadcasts 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  RETURN affected_rows;
END;
$$;

-- Create trigger to update updated_at on admin_broadcasts
CREATE OR REPLACE TRIGGER update_admin_broadcasts_updated_at
BEFORE UPDATE ON public.admin_broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();