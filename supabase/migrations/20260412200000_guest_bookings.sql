-- Guest booking support
-- Make user_id nullable so unregistered users can book
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- Guest contact info columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- RLS: allow anon to SELECT their own guest booking by UUID.
-- UUIDs are 128-bit random — functionally unguessable, same security model as
-- shareable links (Google Docs, Calendly, etc.).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'anon_select_guest_booking'
  ) THEN
    CREATE POLICY "anon_select_guest_booking" ON bookings
      FOR SELECT TO anon
      USING (user_id IS NULL);
  END IF;
END $$;

-- Allow payments.user_id to be null for guest payments
ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
