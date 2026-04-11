-- Move btree_gist extension from public schema to extensions schema
-- This fixes the security warning "Extension in Public"

-- Step 1: Create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Drop the constraint that depends on the extension
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

-- Step 3: Drop and recreate the extension in extensions schema
DROP EXTENSION IF EXISTS btree_gist;
CREATE EXTENSION btree_gist SCHEMA extensions;

-- Step 4: Recreate the overlapping bookings constraint using the new extension location
ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings 
  EXCLUDE USING gist (
    court_id WITH =, 
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = ANY (ARRAY['pending'::booking_status, 'confirmed'::booking_status]));