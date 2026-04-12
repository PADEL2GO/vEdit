-- Credits-as-payment feature settings on site_settings
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS feature_credits_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credits_payment_max_percent      INT     NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credits_per_euro                 INT     NOT NULL DEFAULT 100;

-- Track how many credits were applied to each booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS credits_used INT NOT NULL DEFAULT 0;
