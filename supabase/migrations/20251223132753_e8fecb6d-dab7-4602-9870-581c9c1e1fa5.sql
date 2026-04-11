-- Phase 1: Booking Robustheit - DB Migrations

-- 1. Add 'completed' and 'refunded' to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2. Fix the booking_availability view to correctly show available slots
DROP VIEW IF EXISTS booking_availability;
CREATE VIEW booking_availability AS
SELECT court_id, location_id, start_time, end_time, status
FROM bookings
WHERE status = 'confirmed' 
   OR (status = 'pending_payment' AND (hold_expires_at IS NULL OR hold_expires_at > now()));

-- 3. Create unique index for slot concurrency protection
-- This prevents double-booking of the same slot
DROP INDEX IF EXISTS idx_bookings_slot_unique;
CREATE UNIQUE INDEX idx_bookings_slot_unique 
ON bookings (court_id, start_time, end_time) 
WHERE status IN ('pending_payment', 'confirmed');

-- 4. Add processed_for_rewards flag to track which bookings have been processed
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rewards_processed_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Create index for efficient completed bookings query
CREATE INDEX IF NOT EXISTS idx_bookings_completed_check 
ON bookings (status, end_time) 
WHERE status = 'confirmed';

-- 6. Add idempotency key to payments for retry safety
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency 
ON payments (idempotency_key) 
WHERE idempotency_key IS NOT NULL;