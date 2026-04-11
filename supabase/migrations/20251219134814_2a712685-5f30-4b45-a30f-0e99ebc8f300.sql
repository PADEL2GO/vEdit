-- First delete existing global prices (they don't have court_id)
DELETE FROM court_prices;

-- Add court_id column as NOT NULL with foreign key
ALTER TABLE court_prices 
ADD COLUMN court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE;

-- Add unique constraint: each duration only once per court
ALTER TABLE court_prices 
ADD CONSTRAINT court_prices_court_duration_unique 
UNIQUE (court_id, duration_minutes);