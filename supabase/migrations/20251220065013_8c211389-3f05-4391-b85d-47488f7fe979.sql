-- Fix 1: Recreate booking_availability view with SECURITY INVOKER (default)
-- This removes the SECURITY DEFINER property that was causing the security warning
DROP VIEW IF EXISTS public.booking_availability;

CREATE VIEW public.booking_availability 
WITH (security_invoker = true)
AS
SELECT 
  court_id, 
  location_id, 
  start_time, 
  end_time, 
  status
FROM bookings
WHERE 
  -- Confirmed bookings: always count as occupied
  status = 'confirmed'
  OR
  -- Pending payment: only if hold hasn't expired yet
  (status = 'pending_payment' AND (hold_expires_at IS NULL OR hold_expires_at > NOW()));

-- Fix 2: Add RLS policies for avatars storage bucket
-- The bucket already exists, just need to add proper policies

-- Allow anyone to view avatars (public profile images)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload their own avatar (using user_id folder structure)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );