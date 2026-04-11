-- Extend booking_status enum with new values
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'expired';