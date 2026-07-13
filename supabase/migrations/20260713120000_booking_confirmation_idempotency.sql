-- Booking confirmation email idempotency
-- Mirrors marketplace_redemptions.customer_confirmation_sent_at.
-- send-booking-confirmation flips this NULL -> now() with an atomic claim before it
-- mails, so a re-delivered Stripe webhook (or the free/points path + a retry) can never
-- double-mail the customer; on any send failure the claim is released (set back to NULL)
-- so a later delivery re-sends instead of the booking being stuck "confirmation sent"
-- with no email out.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
