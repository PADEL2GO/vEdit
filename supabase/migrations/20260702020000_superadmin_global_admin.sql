-- -----------------------------------------------------------------------------
-- Guarantee fsteinfelder@padel2go.eu as a permanent global admin.
-- Idempotently re-seed the admin role so an accidentally-removed role is
-- restored on every deploy. Safe to run repeatedly (no duplicate rows).
-- -----------------------------------------------------------------------------

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'fsteinfelder@padel2go.eu'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = u.id AND r.role = 'admin'
  );
