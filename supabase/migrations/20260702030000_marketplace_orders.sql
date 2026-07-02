-- =============================================================================
-- MARKETPLACE ORDERS (July 2026)
-- Extends marketplace_redemptions into a pending-order anchor for the new
-- money+points marketplace flow (marketplace-checkout + stripe-webhook).
-- Guests have no user_id; cash is tracked in amount_cents; points spent are
-- split into play_spent / reward_spent (mirrors reserve_points); the Stripe
-- session id gives the webhook an idempotency key for settle/refund.
-- =============================================================================

-- Guests have no authenticated user.
ALTER TABLE public.marketplace_redemptions
  ALTER COLUMN user_id DROP NOT NULL;

-- Cash charged (cents) and guest contact for guest cash-only orders.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS amount_cents integer;

ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS guest_email text;

ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS guest_name text;

-- Stripe checkout session id for webhook idempotency.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Points reserved/spent, split like reserve_points.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS play_spent integer NOT NULL DEFAULT 0;

ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS reward_spent integer NOT NULL DEFAULT 0;

-- Widen the status check so orders can be cancelled (expired/refunded session).
ALTER TABLE public.marketplace_redemptions
  DROP CONSTRAINT IF EXISTS marketplace_redemptions_status_check;

ALTER TABLE public.marketplace_redemptions
  ADD CONSTRAINT marketplace_redemptions_status_check
  CHECK (status IN ('success', 'failed', 'pending', 'cancelled'));

-- One order per Stripe session (webhook idempotency).
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_redemptions_stripe_session
  ON public.marketplace_redemptions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
