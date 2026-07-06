-- Idempotency claim for the customer order-confirmation email (send-marketplace-confirmation).
-- Set to now() by the single caller that wins the atomic claim, so a retried Stripe webhook
-- can never double-mail the buyer. NULL = not yet sent.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS customer_confirmation_sent_at timestamptz;

-- Same idempotency guard for the customer refund-confirmation email (marketplace-refund),
-- so a concurrent admin double-refund can never send two refund emails.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS refund_confirmation_sent_at timestamptz;
