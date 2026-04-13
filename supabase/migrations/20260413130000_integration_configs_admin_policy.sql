-- Allow admins and superadmin to read/write site_integration_configs directly.
-- This lets the admin UI bypass the integrations-admin-api edge function.

CREATE POLICY "admins_manage_integration_configs"
ON site_integration_configs
FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
