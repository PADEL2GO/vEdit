# P2G Economy + Payments Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make P2G points a unified, server-enforced discount currency across bookings and a new money+points marketplace (Stripe/PayPal), add superadmin point + exchange-rate controls, make events + marketplace publicly viewable with "see you soon" empty states, and close the Stripe go-live gaps.

**Architecture:** All point math is server-side. One atomic, service-role-only `reserve_points` RPC spends play-then-reward and cannot overdraw; the discount is capped by the admin-set rate × real balance. Bookings and marketplace share this currency and the same "fully-covered → skip Stripe, else charge the remainder (card+PayPal)" pattern. The `stripe-webhook` gains a `marketplace_purchase` branch. No new user-writable RLS.

**Tech Stack:** Supabase Postgres + Deno edge functions, Stripe (card+PayPal, hosted checkout), React 18 + TS + Vite + react-i18next, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-07-01-p2g-economy-and-payments-launch-design.md`

**Execution:** Subagent-driven, on branch `feature/p2g-economy-payments` (kept off `main` so
half-built money code never auto-deploys to Vercel; merge to main when the epic is complete +
reviewed). **Progress:** ✅ Task 1 done (migration `20260702000000`, commit `a041f357`) — the
implementer correctly rewrote three `<` guards to `>=`/`>` for SQL-editor safety. Tasks 2–18 pending.

**Testing note:** This repo has no unit-test harness (per CLAUDE.md). Verification per task = `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` (frontend) / structural + brace checks (Deno functions) + the manual + adversarial checks called out. **Every new money/points edge-function path gets an adversarial correctness review before deploy** (as done for P1 wallet integrity and cancel-booking).

**Deploy note:** New DB objects must be run in the Supabase SQL editor; changed edge functions redeployed; frontend auto-deploys via Vercel. Migrations must be ASCII + use named `$tag$` dollar-quotes + no `<` chars (the SQL editor mishandles bare `$$` and `<`).

---

## File structure

**New files**
- `supabase/migrations/20260702000000_p2g_points_economy.sql` — `reserve_points`, `refund_points`, `set_wallet_credits` RPCs; `bookings.reserved_reward`; `marketplace_items.price_cents`; extend `settle/release_booking_reserves` for reserved_reward.
- `supabase/functions/marketplace-checkout/index.ts` — money+points marketplace checkout (auth + guest), Stripe session or free order.
- `src/pages/Marketplace.tsx` — public (logged-out) marketplace page (cash-only + upsell + empty state).
- `src/hooks/usePointsValue.ts` — shared hook: reads `credits_per_euro`/`credits_payment_max_percent`/`feature_credits_payment_enabled`; exposes `centsPerPoint`, `maxPercent`, `enabled`.
- `docs/superpowers/plans/2026-07-01-stripe-go-live-checklist.md` — owner go-live checklist.

**Modified files**
- `supabase/functions/admin-credits/index.ts` — `set_credits` action + superadmin email bypass.
- `supabase/functions/create-checkout-session/index.ts` — unified points reserve + 100% free path.
- `supabase/functions/create-guest-booking/index.ts` — allowedOrigins (add prod domains if missing).
- `supabase/functions/stripe-webhook/index.ts` — settle/release reserved_reward; `marketplace_purchase` branch.
- `supabase/config.toml` — `[functions.marketplace-checkout] verify_jwt = false`.
- `src/components/admin/p2g/P2GWalletsTab.tsx` — "Set to exact value" mode + lifetime field.
- `src/pages/admin/AdminP2GPoints.tsx` — exchange-rate settings card.
- `src/pages/admin/AdminMarketplace.tsx` + `src/hooks/useAdminMarketplace.ts` — `price_cents` field.
- `src/pages/dashboard/DashboardMarketplace.tsx` — money checkout + points balance/worth + empty state.
- `src/hooks/useMarketplaceRedeem.ts` → replace with `useMarketplaceCheckout.ts` (money+points).
- `src/App.tsx` — public `/marketplace` route; marketplace guard on `feature_marketplace_enabled`.
- `src/hooks/useBookingCheckout.ts` + `src/pages/BookingCheckout.tsx` — read rate, combined points, free state.
- `src/pages/Events.tsx` — "see you soon" empty state.
- `src/components/Navigation.tsx` / `DashboardNavigation.tsx` — Events nav for both states.
- locale JSON (de/en) — new keys per touched surface (marketplace/events/admin), keep parity.

---

## PHASE 1 — Points foundation + admin controls

### Task 1: Migration — points RPCs + columns

**Files:** Create `supabase/migrations/20260702000000_p2g_points_economy.sql`

- [ ] **Step 1:** Write the migration. Named dollar-quotes, ASCII, no `<`.

```sql
-- P2G ECONOMY (July 2026): unified points discount currency + admin set.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reserved_reward integer NOT NULL DEFAULT 0;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS price_cents integer;

-- reserve_points: spend play first, then reward; never overdraw. Returns amounts spent.
CREATE OR REPLACE FUNCTION public.reserve_points(p_user_id uuid, p_amount integer)
RETURNS TABLE (play_spent integer, reward_spent integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $reserve_points$
DECLARE v_play integer; v_reward integer; v_from_play integer; v_from_reward integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
  SELECT play_credits, reward_credits INTO v_play, v_reward
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_play,0) + COALESCE(v_reward,0) < p_amount THEN
    RETURN QUERY SELECT 0, 0; RETURN;  -- insufficient: reserve nothing
  END IF;
  v_from_play := LEAST(v_play, p_amount);
  v_from_reward := p_amount - v_from_play;
  UPDATE public.wallets
  SET play_credits = play_credits - v_from_play,
      reward_credits = reward_credits - v_from_reward,
      updated_at = now()
  WHERE user_id = p_user_id;
  RETURN QUERY SELECT v_from_play, v_from_reward;
END;
$reserve_points$;
REVOKE ALL ON FUNCTION public.reserve_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_points(uuid, integer) TO service_role;

-- refund_points: add back on cancel/expiry (never touches lifetime).
CREATE OR REPLACE FUNCTION public.refund_points(p_user_id uuid, p_play integer, p_reward integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $refund_points$
BEGIN
  UPDATE public.wallets
  SET play_credits = play_credits + GREATEST(0, COALESCE(p_play,0)),
      reward_credits = reward_credits + GREATEST(0, COALESCE(p_reward,0)),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$refund_points$;
REVOKE ALL ON FUNCTION public.refund_points(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points(uuid, integer, integer) TO service_role;

-- set_wallet_credits: superadmin "set to exact value" for one credit type + optional lifetime.
CREATE OR REPLACE FUNCTION public.set_wallet_credits(
  p_user_id uuid, p_credit_type text, p_value integer, p_lifetime integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $set_wallet_credits$
BEGIN
  IF p_value IS NULL OR p_value < 0 THEN RAISE EXCEPTION 'value must be >= 0'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  IF p_credit_type = 'REWARD' THEN
    UPDATE public.wallets SET reward_credits = p_value,
      lifetime_credits = COALESCE(p_lifetime, lifetime_credits), updated_at = now()
      WHERE user_id = p_user_id;
  ELSIF p_credit_type = 'PLAY' THEN
    UPDATE public.wallets SET play_credits = p_value,
      lifetime_credits = COALESCE(p_lifetime, lifetime_credits), updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'unknown credit_type %', p_credit_type;
  END IF;
END;
$set_wallet_credits$;
REVOKE ALL ON FUNCTION public.set_wallet_credits(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_wallet_credits(uuid, text, integer, integer) TO service_role;
```

- [ ] **Step 2:** Verify ASCII / no bare `$$` / no `<`:
  `node -e 'const s=require("fs").readFileSync("supabase/migrations/20260702000000_p2g_points_economy.sql","utf8"); console.log("<:",(s.match(/</g)||[]).length,"bare$$:",(s.match(/\$\$/g)||[]).length,"nonASCII:",(s.match(/[^\x00-\x7F]/g)||[]).length)'` → all 0.
- [ ] **Step 3:** Commit: `git add supabase/migrations/20260702000000_p2g_points_economy.sql && git commit -m "feat(db): p2g points economy RPCs + columns"`

> **Note for later (settle/release):** `settle_booking_reserves` and `release_booking_reserves` (in `20260701120000`) currently only handle `reserved_credits` (play). Task 6 adds a follow-up migration to make them also finalize/refund `reserved_reward`.

### Task 2: admin-credits — `set_credits` action + superadmin email bypass

**Files:** Modify `supabase/functions/admin-credits/index.ts`

- [ ] **Step 1:** In the auth gate (~`:39-48`), after the `user_roles` admin check, also accept the superadmin email so the email-only superadmin is authorized. Replace the "throw Admin access required" logic with: authorized if `has admin user_roles row` OR `userData.user.email === 'fsteinfelder@padel2go.eu'`.
- [ ] **Step 2:** Add a `set_credits` action (mirror `adjust_credits` at `:125-221`) that: reads current wallet; validates `creditType in ('REWARD','PLAY')`, `targetValue >= 0`, non-empty reason; computes `delta = targetValue - current`; calls `supabaseAdmin.rpc("set_wallet_credits", { p_user_id, p_credit_type: creditType, p_value: targetValue, p_lifetime: lifetimeValue ?? null })`; inserts a `points_ledger` row (`entry_type:'ADMIN_SET'`, `delta_points: delta`, `balance_after: targetValue`, correct `credit_type`); inserts `admin_activity_log` + a user `notification`. Return `{ success, delta, newBalance: targetValue }`.

```ts
// inside the action switch, new branch:
if (action === "set_credits") {
  const { userId, creditType, targetValue, lifetimeValue, reason } = body;
  if (!reason) throw new Error("reason required");
  if (!["REWARD", "PLAY"].includes(creditType)) throw new Error("bad creditType");
  if (typeof targetValue !== "number" || targetValue < 0) throw new Error("bad targetValue");
  const { data: w } = await supabaseAdmin.from("wallets")
    .select("reward_credits, play_credits, lifetime_credits").eq("user_id", userId).maybeSingle();
  const current = creditType === "REWARD" ? (w?.reward_credits ?? 0) : (w?.play_credits ?? 0);
  const delta = targetValue - current;
  const { error: rpcErr } = await supabaseAdmin.rpc("set_wallet_credits", {
    p_user_id: userId, p_credit_type: creditType, p_value: targetValue,
    p_lifetime: typeof lifetimeValue === "number" ? lifetimeValue : null,
  });
  if (rpcErr) throw new Error(rpcErr.message);
  await supabaseAdmin.from("points_ledger").insert({
    user_id: userId, credit_type: creditType, delta_points: delta,
    balance_after: targetValue, entry_type: "ADMIN_SET", description: `Admin set: ${reason}`,
  });
  await supabaseAdmin.from("admin_activity_log").insert({
    admin_user_id: user.id, action: "CREDIT_SET", target_type: "user", target_id: userId,
    details: { creditType, targetValue, delta, lifetimeValue, reason },
  });
  await supabaseAdmin.from("notifications").insert({
    user_id: userId, type: "credit_adjustment",
    title: "P2G Punkte aktualisiert", message: `Dein Punktestand wurde angepasst.`,
  });
  return json({ success: true, delta, newBalance: targetValue });
}
```

- [ ] **Step 3:** Relax the `points_ledger_entry_type_check` constraint (Task 1's migration or a small addendum) to include `'ADMIN_SET'` (the June migration `20260610120000` lists allowed entry_types — add `ADMIN_SET`). Add this ALTER to Task 1's migration file if not already present.
- [ ] **Step 4:** Structural check (braces balanced) + adversarial note. Commit: `git commit -am "feat(admin-credits): set_credits action + superadmin email bypass"`

### Task 3: P2GWalletsTab — "Set to value" mode + lifetime

**Files:** Modify `src/components/admin/p2g/P2GWalletsTab.tsx`

- [ ] **Step 1:** In the adjust dialog (`:343-405`), add a mode toggle: "Add / Subtract" (existing relative) vs "Set to value". In "Set to value" mode, show a number input for the target value and (for the chosen type) an optional lifetime input.
- [ ] **Step 2:** In the mutation (`:103-135`), when mode is "set", invoke `admin-credits` with `{ action: "set_credits", userId, creditType, targetValue, lifetimeValue, reason }`; keep the existing `adjust_credits` path for relative. Require a non-empty reason for both (fixes the existing empty-reason mismatch).
- [ ] **Step 3:** Verify: `npx tsc --noEmit -p tsconfig.app.json` (no new errors in this file) + `npm run build`. Commit.

### Task 4: Exchange-rate control in AdminP2GPoints

**Files:** Modify `src/pages/admin/AdminP2GPoints.tsx` (+ reuse the `site_settings` read/write pattern from `AdminFeatures.tsx:165-191`)

- [ ] **Step 1:** Add a "P2G Punktewert" settings card (e.g. into the Übersicht/Dashboard tab) that reads `credits_per_euro`, `credits_payment_max_percent`, `feature_credits_payment_enabled` from `site_settings` (id='global') and lets the superadmin edit them (number inputs + a toggle), writing back with validation (`credits_per_euro >= 1`, `1 <= max_percent <= 100`) — identical columns to `AdminFeatures` so the two stay in sync.
- [ ] **Step 2:** Show the derived value ("100 Punkte = 1,00 €" style) live. Verify tsc+build. Commit.

---

## PHASE 2 — Booking flow (unified points discount up to 100%)

### Task 5: create-checkout-session — unified points reserve + free path

**Files:** Modify `supabase/functions/create-checkout-session/index.ts`

- [ ] **Step 1:** Rename the request field to accept `points_to_use` (keep back-compat: `const pointsToUse = body.points_to_use ?? body.credits_to_use ?? 0`).
- [ ] **Step 2:** Replace the play-only block (`:315-368`): read `feature_credits_payment_enabled`, `credits_payment_max_percent`, `credits_per_euro`; read wallet `play_credits, reward_credits`; `centsPerPoint = 100 / credits_per_euro`; `maxDiscountCents = floor(ownerPaymentCents * maxPercent/100)`; `requestedDiscountCents = floor(pointsToUse * centsPerPoint)`; `actualDiscountCents = min(requestedDiscountCents, maxDiscountCents, floor((play+reward)*centsPerPoint))`; `appliedPoints = ceil(actualDiscountCents / centsPerPoint)`; call `reserve_points(user.id, appliedPoints)` → `{play_spent, reward_spent}`; persist `reserved_credits = play_spent`, `reserved_reward = reward_spent` on the booking; `ownerPaymentCents -= actualDiscountCents`.
- [ ] **Step 3:** **Full-coverage path:** if `ownerPaymentCents <= 0` (points cover everything), do NOT create a Stripe session — mark the booking confirmed directly (reuse the existing free/voucher path: set status confirmed, `credits_used = play_spent`, `reserved_*` finalized/zeroed, award/rewards trigger + confirmation email as the webhook would), and return `{ url: null, free: true }`. Else clamp to the 50c Stripe minimum as today and create the session.
- [ ] **Step 4:** Update `releaseReserves()` compensation to refund both play_spent + reward_spent via `refund_points`.
- [ ] **Step 5:** Structural check + **adversarial review** of the money path (idempotency, cap, free path, overdraw). Commit.

### Task 6: settle/release reserved_reward (migration + webhook)

**Files:** Create `supabase/migrations/20260702010000_reserve_reward_settle.sql`; Modify `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1:** Migration: `CREATE OR REPLACE` `release_booking_reserves` and `settle_booking_reserves` (copy from `20260701120000`, named tags, no `<`) so they also read `reserved_reward` — release refunds both play + reward via `refund_points`; settle records `credits_used = reserved_credits + reserved_reward` (or keep separate columns) and zeroes both. Verify ASCII/tags. 
- [ ] **Step 2:** In `stripe-webhook` expired/refund paths, ensure the reserved_reward is refunded (the RPC handles it; confirm no code reads only `reserved_credits`).
- [ ] **Step 3:** Structural check + adversarial review. Commit.

### Task 7: Booking frontend — real rate + combined points + free state

**Files:** Modify `src/hooks/useBookingCheckout.ts`, `src/pages/BookingCheckout.tsx`; Create `src/hooks/usePointsValue.ts`

- [ ] **Step 1:** `usePointsValue.ts` — React Query hook reading the three `site_settings` columns; returns `{ centsPerPoint: 100/credits_per_euro, maxPercent, enabled }` (staleTime long).
- [ ] **Step 2:** `useBookingCheckout.ts`: fetch wallet `play_credits + reward_credits` (combined `availablePoints`); `maxPointsForBooking = enabled ? min(availablePoints, floor(price * maxPercent/100 / centsPerPoint)) : 0`; pass `points_to_use` to the function; handle `{ free: true }` (skip Stripe redirect → go to success).
- [ ] **Step 3:** `BookingCheckout.tsx`: slider max = `maxPointsForBooking`; € discount = `(pointsToUse * centsPerPoint / 100)`; show combined available points; show "kostenlos" state when discount covers the full price. Remove hardcoded `/100` and `*0.5`.
- [ ] **Step 4:** Add/keep i18n keys (booking.json de/en, parity). Verify tsc+build. Commit.

---

## PHASE 3 — Marketplace money store + public/guest + points + empty state

### Task 8: marketplace_items price + admin field

**Files:** Modify `src/pages/admin/AdminMarketplace.tsx`, `src/hooks/useAdminMarketplace.ts`

- [ ] **Step 1:** Add a `price_cents` (€) input to the admin item dialog; thread it through create/update mutations. Require `price_cents > 0`. Verify tsc+build. Commit.

### Task 9: marketplace-checkout edge function

**Files:** Create `supabase/functions/marketplace-checkout/index.ts`; Modify `supabase/config.toml`

- [ ] **Step 1:** New function (mirror `create-checkout-session` + `marketplace-redeem`): accept `{ item_id, points_to_use, quantity=1, shipping?, guest_email?, guest_name? }`. Auth: if a JWT is present, resolve the user (points allowed); if none, it's a **guest** (cash-only — ignore points). Re-fetch item `.eq is_active true`; validate stock; validate shipping for `product_type='purchase'`.
- [ ] **Step 2:** Server price: `price_cents`. If user (not guest): compute points discount exactly like Task 5 (`reserve_points`), cap at `maxPercent`. Guests: no discount.
- [ ] **Step 3:** **Full-coverage path:** if a logged-in user's points cover the whole price → place the order immediately (create the redemption/order row, decrement stock atomically with rollback, write `points_ledger`, email fulfillment) and return `{ free: true }`. Else create a Stripe session (`payment_method_types: ["card","paypal"]`, `metadata.type='marketplace_purchase'`, item + reserved points + shipping in metadata) for the remainder; return `{ url }`.
- [ ] **Step 4:** `config.toml`: `[functions.marketplace-checkout] verify_jwt = false`. Include the production domains in `allowedOrigins`.
- [ ] **Step 5:** Structural check + **adversarial review** (double-charge, stock race, points overdraw, guest path). Commit.

### Task 10: stripe-webhook — marketplace_purchase branch

**Files:** Modify `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1:** In `checkout.session.completed`, before the booking branch, handle `session.metadata?.type === 'marketplace_purchase'`: idempotently create the order/redemption row, finalize the reserved points (they were already deducted by reserve_points at checkout — just settle; on the guest path none), atomically decrement stock (`gt("stock_quantity", 0)`) with rollback, write `points_ledger`, email fulfillment to `contact@padel2go.eu`. On `checkout.session.expired` for a marketplace session, refund the reserved points via `refund_points` and restore nothing else (stock wasn't decremented yet).
- [ ] **Step 2:** Structural check + adversarial review. Commit.

### Task 11: DashboardMarketplace — money checkout + points display + empty state

**Files:** Modify `src/pages/dashboard/DashboardMarketplace.tsx`; replace `src/hooks/useMarketplaceRedeem.ts` → `src/hooks/useMarketplaceCheckout.ts`

- [ ] **Step 1:** `useMarketplaceCheckout.ts`: invoke `marketplace-checkout`; handle `{ url }` (redirect) and `{ free: true }` (success toast + invalidate).
- [ ] **Step 2:** `DashboardMarketplace.tsx`: show each item's € price + the max points-discount at the configured value; a points input/slider per purchase; **always show the user's current P2G points balance and its € worth** (via `usePointsValue`). Show "see you soon" empty state when no active items.
- [ ] **Step 3:** i18n keys. Verify tsc+build. Commit.

### Task 12: Public /marketplace page (guest cash-only + upsell)

**Files:** Create `src/pages/Marketplace.tsx`; Modify `src/App.tsx`

- [ ] **Step 1:** `Marketplace.tsx` — public page listing active items (uses `useMarketplaceItems`, public RLS read). Guests can buy **cash only** via `marketplace-checkout` (no points), collecting email + shipping for `purchase` items. Prominent **upsell** banner: "Create a free account to earn P2G points on every purchase and refer friends for discounts" → `/auth`. "See you soon" empty state.
- [ ] **Step 2:** `App.tsx`: add public route `<Route path="/marketplace" element={<Marketplace />} />` (lazy). Verify tsc+build. Commit.

### Task 13: Marketplace visibility gating

**Files:** Modify `src/App.tsx` (+ a small guard component if needed)

- [ ] **Step 1:** Change `/dashboard/marketplace` gating from `RequireAppLaunched` to a marketplace-specific guard: admins always pass; else require `feature_marketplace_enabled` (from `useFeatureToggles`), else redirect to `/marketplace` (the public page). This lets the store go live independently of the master app-launch flag.
- [ ] **Step 2:** Ensure the nav link logic (`DashboardNavigation.tsx`) shows the store when `marketplace_enabled`. Verify tsc+build. Commit.

---

## PHASE 4 — Stripe/PayPal go-live

### Task 14: allowedOrigins + go-live checklist

**Files:** Modify `supabase/functions/create-guest-booking/index.ts`; Create `docs/superpowers/plans/2026-07-01-stripe-go-live-checklist.md`

- [ ] **Step 1:** Confirm/append the production domains (`https://www.padel2go-official.com`, `https://www.padel2go-official.de`, `https://padel2go-official.de`) to `allowedOrigins` in `create-guest-booking` (and the new `marketplace-checkout`); keep `payment_method_types: ["card","paypal"]` in both money flows.
- [ ] **Step 2:** Write the checklist doc (from the spec Part 4): set `sk_live_` key, register the live webhook for the 4 events + `whsec_`, run the `site_integration_configs` migrations, enable PayPal on the live Stripe account, live test booking + purchase, ignore the mode/publishable fields. Commit.

---

## PHASE 5 — Events public + "see you soon"

### Task 15: Events empty state + nav

**Files:** Modify `src/pages/Events.tsx`; `src/components/Navigation.tsx` / `DashboardNavigation.tsx`

- [ ] **Step 1:** `Events.tsx` — replace the plain empty text (`:380-385`) with a friendly "see you soon" waiting state (icon + message) when there are no events. Confirm `/events` stays public + ungated (it already is). Reuse a shared "see you soon" component with the marketplace empty state if convenient.
- [ ] **Step 2:** Ensure Events appears in the public nav and (already) the logged-in nav. i18n keys (events + a shared `comingSoon`). Verify tsc+build. Commit.

---

## PHASE 6 — Admin robustness + marketplace analytics

### Task 16: Guarantee `fsteinfelder@padel2go.eu` as a permanent global admin

**Files:** Create `supabase/migrations/20260702020000_superadmin_global_admin.sql`; audit admin edge functions.

- [ ] **Step 1:** Migration idempotently re-seeds the admin role (so an accidentally-removed role is restored):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'fsteinfelder@padel2go.eu'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin');
```

- [ ] **Step 2:** Grep every admin-only edge function for a role check that queries only `user_roles` (e.g. `admin-notifications-api`, `translate-content`, `generate-article`, `admin-credits`) and ensure each ALSO accepts `auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'` (Task 2 covers `admin-credits`) so the email-only superadmin is always authorized server-side.
- [ ] **Step 3:** Harden `delete_user` in `admin-credits` to refuse deleting (or removing the admin role of) the superadmin email. Commit.

### Task 17: AdminUsers lists ALL registered users

**Files:** Modify `supabase/functions/admin-credits/index.ts` (new `list_all_users` action); `src/pages/admin/AdminUsers.tsx`

- [ ] **Step 1:** Root cause: `AdminUsers.tsx:112` builds the list from `profiles`, so any `auth.users` row without a profile is invisible. Add an admin-gated `list_all_users` action that pages over `auth.users` (`supabaseAdmin.auth.admin.listUsers({ page, perPage })`) and LEFT-JOINs `profiles` / `user_roles` / `wallets`, returning `{ id, email, created_at, email_confirmed_at, display_name, username, role, credits }` — so **every** registered user shows regardless of profile state, and truly-deleted users (gone from `auth.users`) don't.
- [ ] **Step 2:** `AdminUsers.tsx`: consume `list_all_users` with server-side pagination/search (replaces the unbounded `profiles` full-scan — also resolves the P4 perf finding); keep the detail drawer. Verify tsc+build. Commit.

### Task 18: Marketplace admin analytics section

**Files:** Modify `src/pages/admin/AdminMarketplace.tsx` (add an "Umsätze / Analytics" tab); add an admin-gated aggregate action (in `admin-credits` or a small `marketplace-admin` function).

- [ ] **Step 1:** Server aggregate (admin-gated) returning: total marketplace **revenue** (sum of paid orders' cash `amount_cents`), order count, total **points redeemed** as discount (sum), and a **referral breakdown** — per referrer: # referred users, points they earned from referrals, and the € value (`points × centsPerPoint`). Source: the marketplace orders table (from Task 10) + the referral tables used by `referral-api` (grep for `referral_rewards` / attribution rows).
- [ ] **Step 2:** `AdminMarketplace.tsx`: render an analytics section/tab — revenue + orders + points-redeemed KPIs and a referrer table (user, # referred, points, € value). i18n keys. Verify tsc+build. Commit.

> Task 18 depends on Phase 3 (orders table) — schedule it after Task 10.

---

## Deployment (owner actions, after implementation)

1. Run migrations in the Supabase SQL editor: `20260702000000_p2g_points_economy.sql`, `20260702010000_reserve_reward_settle.sql` (+ the `ADMIN_SET` entry_type ALTER), and the pending feature-flag migrations if not already run.
2. Redeploy edge functions: `admin-credits`, `create-checkout-session`, `create-guest-booking`, `stripe-webhook`, and new `marketplace-checkout`.
3. Set `feature_credits_payment_enabled = true` and the exchange rate in the P2G admin; set `feature_marketplace_enabled = true`; add marketplace items with `price_cents`.
4. Stripe go-live checklist (Task 14 doc): live keys + webhook + PayPal enable + live test booking & purchase.

## Self-review (coverage)

- Spec Part 1 → Tasks 1-4. Part 2 → Tasks 5-7. Part 3 → Tasks 8-13. Part 4 → Task 14. Part 5 → Task 15. Hack-proofing → Tasks 1/2/5/9 (server-side reserve + service-role RPCs + superadmin gate) + adversarial reviews. Verification section → per-task checks + the deploy tests.
- No TDD test-first steps (no harness); verification is tsc/build + structural + manual + adversarial review, matching the repo's existing plans and CLAUDE.md.
