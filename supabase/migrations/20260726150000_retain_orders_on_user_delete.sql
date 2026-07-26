-- Account deletion, option (b): transactional records SURVIVE user deletion, anonymized
-- (§147 AO retention — bookings/orders are the revenue trail; Stripe keeps the payment side).
--
-- bookings.user_id was ON DELETE CASCADE (rows vanished with the user) -> SET NULL.
-- marketplace_redemptions.user_id had NO foreign key at all -> add one with SET NULL so
-- the reference is cleanly nulled instead of pointing at a deleted auth user.
-- Both columns are already nullable (guest bookings / guest orders).
-- PII on kept order rows (shipping address) is stripped by the delete-account edge fn.

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Clean up any orphaned user_ids from before this FK existed, so the constraint validates.
UPDATE public.marketplace_redemptions r
SET user_id = NULL
WHERE r.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.user_id);

ALTER TABLE public.marketplace_redemptions
  DROP CONSTRAINT IF EXISTS marketplace_redemptions_user_id_fkey;
ALTER TABLE public.marketplace_redemptions
  ADD CONSTRAINT marketplace_redemptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
