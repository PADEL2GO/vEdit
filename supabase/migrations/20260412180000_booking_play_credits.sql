-- Track play credits awarded per booking (0 = not yet awarded / idempotency guard)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS play_credits_awarded INT NOT NULL DEFAULT 0;

-- Onboarding one-time bonus flags on wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS onboarding_profile_credited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS onboarding_booking_credited  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS onboarding_friend_credited   BOOLEAN NOT NULL DEFAULT FALSE;
