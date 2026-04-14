-- Auto-cancel unpaid bookings after 15 minutes
-- Bookings in 'pending_payment' with hold_expires_at in the past → status = 'cancelled'
-- Runs every minute via pg_cron

-- 1. Update cleanup function: set 'cancelled' + cancelled_at instead of 'expired'
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.bookings
  SET
    status      = 'cancelled',
    cancelled_at = NOW()
  WHERE status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at < NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- 2. Schedule via pg_cron (requires pg_cron extension — enabled by default on Supabase Pro)
--    Removes any previous schedule with the same name first to avoid duplicates.
SELECT cron.unschedule('cleanup-expired-bookings') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-bookings'
);

SELECT cron.schedule(
  'cleanup-expired-bookings',   -- job name
  '* * * * *',                  -- every minute
  $$SELECT public.cleanup_expired_bookings()$$
);
