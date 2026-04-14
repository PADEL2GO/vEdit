-- Allow superadmin email to write site_visuals directly (bypasses has_role check)
DROP POLICY IF EXISTS "Admins can manage site visuals" ON public.site_visuals;

CREATE POLICY "Admins can manage site visuals"
ON public.site_visuals FOR ALL
USING (
  public.has_role(auth.uid(), 'admin')
  OR (auth.jwt() ->> 'email') = 'fsteinfelder@padel2go.eu'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (auth.jwt() ->> 'email') = 'fsteinfelder@padel2go.eu'
);
