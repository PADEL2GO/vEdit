-- Make court_id nullable to allow global fallback prices
ALTER TABLE court_prices ALTER COLUMN court_id DROP NOT NULL;

-- Drop the existing unique constraint that requires court_id
ALTER TABLE court_prices DROP CONSTRAINT IF EXISTS court_prices_court_id_duration_minutes_key;

-- Add new unique constraint that handles NULL court_id for global prices
CREATE UNIQUE INDEX court_prices_global_unique ON court_prices (duration_minutes) WHERE court_id IS NULL;
CREATE UNIQUE INDEX court_prices_court_unique ON court_prices (court_id, duration_minutes) WHERE court_id IS NOT NULL;

-- Insert global default prices (court_id = NULL)
INSERT INTO court_prices (court_id, duration_minutes, price_cents) VALUES
(NULL, 60, 2400),   -- 24€
(NULL, 90, 3600),   -- 36€
(NULL, 120, 4000);  -- 40€