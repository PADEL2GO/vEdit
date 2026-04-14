-- Reset avatar storage bucket policies
-- Drops any stale/duplicate policies and recreates them correctly.
-- The UPDATE policy previously lacked WITH CHECK which can block upserts.

DROP POLICY IF EXISTS "Anyone can view avatars"      ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar"  ON storage.objects;

-- Public read (profile pictures must be visible without auth)
CREATE POLICY "avatars_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload into their own folder: <user_id>/avatar.*
CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE needs both USING (checks existing row) and WITH CHECK (checks new row)
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
