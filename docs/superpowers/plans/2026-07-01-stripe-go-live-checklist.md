# Stripe/PayPal go-live checklist (P2G economy + payments launch)

> Owner actions. Spec: `docs/superpowers/specs/2026-07-01-p2g-economy-and-payments-launch-design.md`
> (Part 4). Plan: `docs/superpowers/plans/2026-07-01-p2g-economy-and-payments-launch.md` (Task 14).

## 0. Code prerequisites (already done)

`create-guest-booking`, `marketplace-checkout`, and `create-checkout-session` all share the same
`allowedOrigins` list (production domains `https://www.padel2go-official.com`,
`https://padel2go-official.com`, `https://www.padel2go-official.de`, `https://padel2go-official.de`,
plus the existing `padel2go.lovable.app` / `padel2go.de` / localhost entries and the
`.lovable.app` / `.lovableproject.com` / `.vercel.app` wildcard suffixes), and `marketplace-checkout`
+ `create-checkout-session` both request `payment_method_types: ["card", "paypal"]`. No further
code change is required for this step.

## 1. Run migrations, in order

Run the following in the Supabase SQL editor, in this exact order:

1. `20260702000000_p2g_points_economy.sql`
2. `20260702010000_reserve_reward_settle.sql`
3. `20260702015000_checkout_claim.sql`
4. `20260702030000_marketplace_orders.sql`
5. `20260702040000_marketplace_settle.sql`

If not already run in production, also run the pending `site_integration_configs` migrations
(needed for the AdminIntegrations Stripe/PayPal key path):

- `20260411000002_add_integration_configs.sql`
- `20260413130000_integration_configs_admin_policy.sql`

## 2. Redeploy edge functions

Redeploy (in any order, after the migrations above):

- `admin-credits`
- `create-checkout-session`
- `create-guest-booking`
- `stripe-webhook`
- `marketplace-checkout`

## 3. Set the live Stripe secret key

Set `STRIPE_SECRET_KEY` = `sk_live_…`. Either:

- Supabase edge function secret (`Deno.env.get("STRIPE_SECRET_KEY")`), **or**
- the `site_integration_configs` fallback via `/admin/integrations` (AdminIntegrations → Stripe →
  "Secret Key" field).

Every payment edge function (`create-checkout-session`, `marketplace-checkout`, `stripe-webhook`)
tries `Deno.env` first, then falls back to `site_integration_configs`. Live vs. test mode is
determined purely by the `sk_live_` / `sk_test_` prefix of this key string.

## 4. Register the live webhook

In the Stripe **live** dashboard, register a webhook endpoint pointing at the deployed
`stripe-webhook` function URL, subscribed to exactly these 4 events (the only ones the handler
processes):

- `checkout.session.completed`
- `checkout.session.expired`
- `charge.refunded`
- `payment_intent.payment_failed`

Copy the resulting signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` — same
`Deno.env` → `site_integration_configs` fallback pattern as the secret key (AdminIntegrations →
Stripe → "Webhook Secret" field).

## 5. Enable PayPal on the live Stripe account

Both `create-checkout-session` (bookings) and `marketplace-checkout` (marketplace) request
`payment_method_types: ["card", "paypal"]`. PayPal must be enabled as a payment method on the
**live** Stripe account (Stripe Dashboard → Settings → Payment methods) or Checkout Sessions will
fail to offer it in production.

## 6. Live end-to-end tests

- **Live test booking:** complete a real paid court booking (card or PayPal) against the live
  key → confirm `checkout.session.completed` fires, the booking flips to `confirmed`, any
  reserved points settle, and the confirmation email sends. Then trigger a refund and confirm
  `charge.refunded` reverses it correctly.
- **Live test marketplace purchase:** complete a real paid marketplace order (money, and
  money+points) against the live key → confirm the order is fulfilled, stock decrements, points
  redeemed settle, and the order email sends.

## 7. Ignore the mode / publishable-key fields

The AdminIntegrations "Mode" dropdown (`test`/`live`) and the "Publishable Key" field for Stripe
are **not wired into any server logic** — they exist for display only. The edge functions
determine live vs. test purely from the `sk_live_` / `sk_test_` prefix of `STRIPE_SECRET_KEY`.
Do not rely on the dropdown to switch modes.
