
-- Fix 1: Remove overly permissive INSERT policy on club_quota_ledger
-- Only service role (edge functions) should insert quota ledger entries
DROP POLICY IF EXISTS "Service role can insert quota ledger" ON public.club_quota_ledger;

-- Fix 2: Fix tautological condition in club booking RLS policy
DROP POLICY IF EXISTS "Club owners can create club bookings for their courts" ON public.bookings;

CREATE POLICY "Club owners can create club bookings for their courts"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    booking_origin = 'club'
    AND club_owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_owner_assignments coa
      WHERE coa.user_id = auth.uid()
      AND coa.court_id = bookings.court_id
    )
  );
