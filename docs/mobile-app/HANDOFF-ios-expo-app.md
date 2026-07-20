# PADEL2GO — iOS App Handoff (Expo / React Native)

**Purpose:** Everything a fresh Claude Code session needs to build the PADEL2GO **iOS app**
in **Expo (React Native)**, simulated in **Xcode**, that shares the **same backend** as the
existing web app (so "website and app speak to each other").

**Scope of this app (agreed with the owner) — logged-in consumer features only:**
1. **Mein P2G** (dashboard home with all infos, like the website)
2. **Booking flow**
3. **Marketplace**
4. **Events**
5. **Mein Profil** (account incl. email/password change)
6. **Notifications**

Everything else (club portal, admin, league, lobbies, chat, friends, public marketing pages)
is **out of scope** — the owner will handle those.

---

## 0. The core idea — how website and app "talk to each other"

There is **no separate backend to build.** The web app and the mobile app both point at the
**same Supabase project**. Same Postgres DB, same Auth users, same Row-Level-Security (RLS),
same Edge Functions. A booking made in the app is the same row the website reads, and vice
versa. The app just needs the Supabase URL + anon key and to obey the same RLS rules.

```
        ┌────────────────┐         ┌────────────────────────────┐
        │  Web (Vite)    │────────▶│                            │
        └────────────────┘         │   Supabase project         │
                                    │   wvvdkuextsbsecqbfksb     │
        ┌────────────────┐         │   • Postgres + RLS         │
        │  iOS (Expo/RN) │────────▶│   • Auth (email/password)  │
        └────────────────┘         │   • Edge Functions (Deno)  │
                                    │   • Storage (avatars…)     │
                                    └────────────────────────────┘
                                              │
                                       Stripe · Resend (email)
```

**Connection details (anon key is public, safe to embed in the app):**

| | Value |
|---|---|
| Supabase URL | `https://wvvdkuextsbsecqbfksb.supabase.co` |
| Project ref | `wvvdkuextsbsecqbfksb` |
| Anon / publishable key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2dmRrdWV4dHNic2VjcWJma3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzE4OTgsImV4cCI6MjA5MTYwNzg5OH0.pt1gRvM5i04FyJz_138xB0KNgOZjBLvtAZfuCkK9zDI` |

> ⚠️ **NEVER put the `service_role` key in the app.** It bypasses RLS. It lives only in Edge
> Function secrets. The app uses ONLY the anon key + the logged-in user's JWT.

---

## 1. Step-by-step: project + backend wiring

### 1.1 Create the Expo app
```bash
npx create-expo-app@latest padel2go-app -e with-router   # Expo Router (file-based)
cd padel2go-app
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  expo-secure-store expo-web-browser expo-linking expo-notifications \
  @tanstack/react-query react-native-url-polyfill
```

Run in the iOS simulator (Xcode must be installed):
```bash
npx expo start          # then press "i" to open the iOS simulator
# or: npx expo run:ios   (native build for push notifications testing)
```
> Push notifications and some native modules require a **dev build** (`expo run:ios` /
> EAS dev client), not just Expo Go.

### 1.2 Supabase client for React Native (the load-bearing differences vs web)
The web client (`src/integrations/supabase/client.ts`) uses `storage: localStorage` and relies
on `detectSessionInUrl`. **Neither exists in RN.** Use this instead:

```ts
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const SUPABASE_URL = 'https://wvvdkuextsbsecqbfksb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2dmRrdWV4dHNic2VjcWJma3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzE4OTgsImV4cCI6MjA5MTYwNzg5OH0.pt1gRvM5i04FyJz_138xB0KNgOZjBLvtAZfuCkK9zDI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,      // web used localStorage — swap for AsyncStorage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // web relied on this; RN has no URL to parse
  },
});

// Keep the session fresh while the app is foregrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```
> For higher security you can store the session in `expo-secure-store` instead of AsyncStorage
> (write a tiny storage adapter with `getItem/setItem/removeItem`). AsyncStorage is fine for MVP.

### 1.3 Auth (email/password — same users as the web)
Auth methods to replicate (from the web `useAuth` hook):
- `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signOut()`
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- `supabase.auth.updateUser({ password })` and `updateUser({ email }, { emailRedirectTo })`
- Re-auth trick used by the web "Sicherheit" tab to confirm the current password before a
  sensitive change: call `signInWithPassword(currentEmail, currentPassword)` — a failed
  sign-in leaves the current session intact.
- Bootstrap: `supabase.auth.onAuthStateChange(...)` + `getSession()`.

**Email confirmation is ON** (Supabase Auth setting). So `signUp` returns `data.session === null`
and the user must click the email link before they can log in. Show a "check your email" screen.

**Deep links for the email flows (important).** The web uses these redirect URLs:
- signup confirm → `${origin}/`
- password reset → `${origin}/auth?mode=reset`
- email change → `${origin}/auth?mode=email-change`

For the app, register an app scheme (e.g. `padel2go://`) and use `expo-linking`:
```ts
import * as Linking from 'expo-linking';
const emailRedirectTo = Linking.createURL('/auth-callback'); // e.g. padel2go://auth-callback
```
Then in the app, handle the incoming deep link: parse the `code`/tokens and call
`supabase.auth.exchangeCodeForSession()` (PKCE) or `setSession()`. **You must add these
redirect URLs** (the `padel2go://...` deep links, plus Expo Go's `exp://...` during dev) to
**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**, otherwise Supabase
rejects them. Set `flowType: 'pkce'` in the client `auth` options for native deep-link exchange.

### 1.4 Generate fresh DB types (do NOT copy the web `types.ts`)
The committed web `src/integrations/supabase/types.ts` **lags behind the migrations** (booking
money columns, single-score wallet consolidation, etc. are missing). Generate current types:
```bash
npx supabase login
npx supabase gen types typescript --project-id wvvdkuextsbsecqbfksb > lib/database.types.ts
```

### 1.5 React Query
The web app uses TanStack React Query everywhere. Reuse the same pattern in the app
(`QueryClientProvider` at the root). Most screens are just queries against Supabase tables +
a few Edge Function calls.

---

## 2. Backend integration rules (RLS — what the app may and may not do)

The app uses the **anon key + the user's JWT**. RLS decides what's allowed. Summary:

**A logged-in client CAN do directly (anon key):**
- Read/insert/update **own** `profiles`; upload avatar to the `avatars` Storage bucket.
- **Read** (only) own `wallets` (the P2G balance), own `bookings`, own `marketplace_redemptions`,
  own `event_registrations`, own `notifications`.
- Read **public** data: `locations` (online only), `courts`, `marketplace_items` (active),
  `events` (published), `site_settings` (feature flags), and `bookings` availability (select-only,
  all rows — needed for availability grids).
- Update own `notifications` (mark read) and delete own notifications.

**MUST go through an Edge Function / RPC (service role — the app calls the function, never writes directly):**
| Action | Use |
|---|---|
| Any **wallet / points** balance change | never write `wallets` directly — always an edge fn |
| **Create / confirm / cancel a booking** | `create-checkout-session` (create+hold), `stripe-webhook` (confirm, server-side), `cancel-booking` |
| **Marketplace redemption** | `marketplace-checkout` (debits wallet + writes redemption atomically) |
| **Event register / cancel** | RPCs `register_for_event(event_id)` / `cancel_event_registration(event_id)` (capacity-safe) |
| **Points read/API** (ledger, rankings, catalog, claim-daily) | `p2g-points-api` |

> Rule of thumb: **reads = direct Supabase query; money/state mutations = edge function.** This
> is the wallet-integrity invariant — balances only change via atomic, service-role RPCs.

### 2.1 Edge functions this app will call (consumer subset)
Call with `supabase.functions.invoke('<name>', { body })` — the SDK attaches the user's JWT.

| Function | Used by app feature | Notes |
|---|---|---|
| `create-guest-booking` | Booking | guest (not-logged-in) court booking |
| `create-checkout-session` | Booking | body `{ booking_id, voucher_id? }` → `{ url, free? }` (Stripe or free) |
| `cancel-booking` | Booking / Mein P2G | user cancels; triggers Stripe refund + points reversal |
| `rewards-estimate` | Booking | preview points earned before checkout |
| `voucher-validate` / `voucher-redeem` | Booking | voucher codes |
| `validate-pin` | Booking | only if a location is PIN-gated |
| `marketplace-checkout` | Marketplace | body `{ item_id, points_to_use, quantity, shipping? }` → `{ url, free?, reference_code? }` |
| `p2g-points-api` | Mein P2G | sub-routes: `/summary`, `/ledger`, `/catalog`, `/rankings`, `/claim-daily` |
| `send-event-confirmation` / `send-event-cancellation` | Events | confirmation/cancellation emails (own account) |
| `send-contact-email`, `newsletter-subscribe` | (optional) | public |

**Do NOT call from the app** (admin/internal): `admin-*`, `marketplace-refund`, `newsletter-send`,
`generate-article`, `translate-content`, `club-*`, and the pure server-to-server ones
(`stripe-webhook`, `send-booking-confirmation`, `send-marketplace-confirmation`,
`rewards-trigger`, `process-completed-bookings`, `send-match-reminders`,
`cleanup-expired-notifications`, `camera-webhook`).

### 2.2 Payments (Stripe) — the one real web→mobile difference
The web does `window.location.assign(stripeCheckoutUrl)` (a full-page redirect to Stripe hosted
Checkout) and Stripe redirects back to `/booking/success`. A native app can't do that. Two options:

- **MVP (no backend change):** open the returned `url` with `expo-web-browser`:
  ```ts
  import * as WebBrowser from 'expo-web-browser';
  const { url, free } = await invoke('create-checkout-session', { booking_id });
  if (free) { /* already confirmed server-side → show success screen */ }
  else if (url) {
    await WebBrowser.openBrowserAsync(url);   // user pays in the in-app browser
    // On return, the booking is confirmed ASYNC by stripe-webhook. Poll the booking row:
    // select status from bookings where id = booking_id → wait for 'confirmed'.
  }
  ```
  Payment success is confirmed by the **`stripe-webhook`** (already live), which flips the
  booking to `confirmed` and (after the recent fix) sends the confirmation email. So the app
  just needs to **poll the booking status** after the browser closes.
- **Cleaner (small backend change):** add a mobile `success_url`/`cancel_url` deep link
  (`padel2go://booking/success`) as a param the `create-checkout-session` function honors, and
  open with `WebBrowser.openAuthSessionAsync(url, 'padel2go://booking/success')` so the browser
  auto-closes on return. Optional; the MVP poll works without touching the backend.

The **free/points path** returns `{ free: true, url: null }` and the booking is already confirmed
server-side — just show the success screen (no browser). Same for a 100% voucher (via
`voucher-redeem`). Marketplace checkout behaves identically (`marketplace-checkout` → `{ url }` or
`{ free, reference_code }`).

### 2.3 Realtime
Supabase Realtime (`postgres_changes`) is used on the web for **notifications** (relevant to this
app), plus lobbies/chat (out of scope). Replicate the notifications subscription (see §3.6). A
Supabase RN client subscribes the same way: `supabase.channel(...).on('postgres_changes', ...).subscribe()`.
Note: a backgrounded app won't hold a websocket open → that's what **push notifications** are for (§3.6.2).

---

## 3. The six features — screens, data sources, and RN notes

Feature-flag note: the web gates some features via a **3-state model** in `site_settings`
(`feature_<name>_state` = `visible` | `demo` | `hidden`; `demo` = admins only). `events`,
`marketplace`, `p2g` are seeded **`visible`**. Read the single `site_settings` row (`id='global'`)
once and hide a feature if its state isn't `visible` (or `demo` && the user is admin). For MVP you
can treat events/marketplace/p2g as on. (The old `feature_app_launched` / `RequireAppLaunched`
gate no longer exists in live code — ignore it.)

### 3.1 Mein P2G (home) — `src/pages/dashboard/DashboardHome.tsx` (web reference)
The main landing screen after login. Sections (mirror these):
1. **Header** — greeting "Moin, {displayName}." + German date + current expert-level badge.
2. **P2G Points card** — big balance ("1.200 P") + € value + conversion rate ("360 P = €1,00") +
   "+X P diese Woche" + progress bar to next level + buttons "Punkte einlösen" (→ Marketplace),
   "Historie" (→ points ledger).
3. **Court CTA hero** — "Zeit für dein nächstes Match?" + active-court count + "Jetzt Court buchen".
4. **Quick-access cards** — Meine Buchungen / Events / Marketplace / Mein Profil.
5. **Meine Buchungen** — next 3 upcoming confirmed bookings (date, location, court, time, points),
   "Kostenlose Stornierung bis 24 h vorher"; empty state otherwise.
6. **Event teaser** — next registered event, or "X Events buchbar".
7. **Marketplace teaser** — top 3 items (image, name, €, max redeemable) — only if items exist.
8. **Liga teaser** — static "Coming Soon" (can omit in app or keep as static).
9. **News** — curated articles (optional in app).

**Data sources (queries + hooks to replicate):**
- Profile + wallet: `profiles` (display_name) + `wallets` (`play_credits` = the single P2G score;
  `reward_credits` is legacy/0; `lifetime_credits` drives level).
- Points summary / value / levels: edge fn `p2g-points-api` (`/summary`), plus config for
  points↔€ conversion (`centsPerPoint`, max %). Expert levels come from a DB table
  (name, min_points, max_points, multiplier, emoji, gradient).
- Upcoming bookings: `select … from bookings where user_id = auth.uid() and status='confirmed'
  and start_time > now() order by start_time limit 5` (join `courts`, `locations` for names).
- Active court count: count of active `courts`.
- Weekly points: `points_ledger` rows for the current week.
- Events: published `events` + own `event_registrations`.
- Marketplace: active `marketplace_items`.

### 3.2 Booking flow — web refs `src/pages/BookingLocation.tsx`, `src/hooks/useBookingLocation.ts`, `useBookingCheckout.ts`
Flow: pick location → pick court/date/time slot → create a `pending_payment` hold → checkout
(Stripe or free/points/voucher) → confirmed.
- **Availability:** read `locations` (online), `courts`, and existing `bookings` (public
  select) to build the slot grid. Times are `timestamptz` (UTC); the user picks Berlin wall-clock
  → store `.toISOString()`.
- **Create hold:** logged-in user inserts a `bookings` row `status='pending_payment'` with
  `hold_expires_at`; guest uses `create-guest-booking`. (The web inserts directly for logged-in
  users, but the canonical/safe path sets the hold + reserves points — prefer the edge functions.)
- **Checkout:** `create-checkout-session` → Stripe `url` or `{ free }`. See §2.2 for the RN
  browser+poll pattern. Success screen after `status='confirmed'`.
- **Cancel:** `cancel-booking` (refund + points reversal). "Kostenlose Stornierung bis 24 h vorher."
- **Confirmation email** is sent by the backend automatically (recently fixed to be idempotent) —
  the app does nothing for that.
- **Booking status enum:** `pending`, `pending_payment`, `confirmed`, `completed`, `cancelled`,
  `expired`, `refunded`.

### 3.3 Marketplace — web refs `src/pages/Marketplace.tsx`, `src/hooks/useMarketplaceCheckout.ts`
- **Catalog:** read `marketplace_items` where `is_active=true` (fields: name, category, `credit_cost`,
  `price_cents`, description, partner_name, image_url, stock_quantity, slug).
- **Redeem/checkout:** `marketplace-checkout` with `{ item_id, points_to_use, quantity, shipping? }`
  → `{ url }` (Stripe, open in browser) or `{ free, reference_code }` (points covered it). Points
  can partly discount a cash price (`credits_per_euro`, max % from config).
- **Orders:** read own `marketplace_redemptions` (status `success|failed|pending`, `reference_code`).
- No cart in Phase 1 (single-item checkout).

### 3.4 Events — web refs `src/pages/dashboard/DashboardEvents.tsx`, `src/hooks/useEventRegistrations.ts`
- **List:** read `events` where `is_published=true` (title, description, `start_at`/`end_at`,
  image_url, `ticket_url` (external paid), `price_cents`, `capacity`, `registrations_count`).
- **Register (free events, Phase 1):** RPC `register_for_event(event_id)` (capacity-safe, issues a
  `ticket_code`); then `send-event-confirmation`. Paid events link out to external `ticket_url`.
- **Cancel:** RPC `cancel_event_registration(event_id)` + `send-event-cancellation`.
- **My registrations:** read own `event_registrations` (status `confirmed|cancelled`, `ticket_code`).
- One active `confirmed` registration per (event, user).

### 3.5 Mein Profil — web refs `src/pages/Account.tsx`, `src/components/account/AccountSecurityTab.tsx`
- **Profile:** read/update own `profiles` (username with availability check + lowercase 3–30 rule,
  display_name, age, avatar). Avatar upload → `avatars` Storage bucket (square-crop to 512px JPEG,
  overwrite `${user.id}/avatar.jpg`).
- **Bookings / Orders / P2G tabs:** own `bookings`, `marketplace_redemptions`, points summary.
- **Sicherheit (Security):** change email + change password.
  - Password: verify current password (re-auth trick) → `updateUser({ password })`.
  - Email: verify current password → `updateUser({ email }, { emailRedirectTo: <deep link> })`
    → Supabase double-confirmation emails (old + new). App shows "Bestätigung ausstehend".
  - Handle the confirmation deep link (`padel2go://auth-callback`, type `email_change` / `recovery`).
- **Account deletion:** currently a `mailto:` to `contact@padel2go.eu` (no in-app delete).

### 3.6 Notifications — web refs `src/hooks/useNotifications.ts`, `src/components/notifications/NotificationCenter.tsx`
Full in-app notification system already exists in the DB.

**`notifications` table:** `id`, `user_id`, `type`, `title`, `message`, `cta_url`, `metadata` (jsonb),
`read_at` (null = unread), `created_at`, `actor_id`, `entity_type` ("booking"/"lobby"/…), `entity_id`,
`broadcast_id`, `expires_at`.

**RLS:** a user reads/updates/deletes **own** notifications directly (anon key) — no edge fn needed
for reading or marking read.

**Read + realtime (replicate on RN):**
```ts
// initial fetch
supabase.from('notifications').select('*')
  .eq('user_id', uid)
  .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
  .order('created_at', { ascending: false }).limit(50);

// live updates
supabase.channel(`notifications-${uid}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
      handleChange)
  .subscribe();
```
- **Mark read:** `update notifications set read_at = now() where id = ?` (or all where read_at is null).
- **Delete:** `delete from notifications where user_id = ?`.
- **Types** (for icon/color theming): `match_reminder`, `friend_request_received`,
  `friend_request_accepted`, `reward_earned`, `level_up`, `lobby_member_joined`, `lobby_cancelled`,
  `lobby_member_paid`, `lobby_full`, `lobby_invite`, `admin_broadcast`.
- Notifications are **created by edge functions** (e.g. `lobby-api`, `friends-api`, `rewards-trigger`,
  `stripe-webhook`, `admin-notifications-api`), not by the client. The app only reads/marks them.

**#### 3.6.1 In-app: bell + list.** Show a bell with unread count (`read_at is null`), a list screen,
mark-read / mark-all-read / delete, and a toast on new INSERT (mirror `useRealtimeNotifications`).

**#### 3.6.2 Push notifications — MUST BE BUILT (nothing exists yet).** There is **no** push infra
(no `device_tokens` table, no FCM/APNs, no expo-notifications). To get real iOS push:
1. **New migration** — `device_tokens` table:
   ```sql
   create table public.device_tokens (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users on delete cascade,
     token text not null unique,
     platform text not null check (platform in ('ios','android','web')),
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
   alter table public.device_tokens enable row level security;
   create policy "own tokens" on public.device_tokens
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
2. **App:** `expo-notifications` — request permission, get the Expo push token at startup, upsert it
   into `device_tokens`. (Needs an EAS dev build + APNs key configured in the Apple developer account.)
3. **Backend:** a small new edge fn (or extend the notification creators) that, after inserting a
   `notifications` row, looks up the user's `device_tokens` and POSTs to the **Expo Push API**
   (`https://exp.host/--/api/v2/push/send`). Cleanest: one `push-notify(user_id, title, body, data)`
   helper called right after each `notifications` insert. This is a backend change the owner should
   green-light; the in-app + email channels work meanwhile.

---

## 4. Design tokens (match the brand)

| Token | Value |
|---|---|
| Brand lime (accent/primary) | **`#C7F011`** (`hsl(71 91% 51%)`) |
| Background / cards | **`#000000`** (pure black); muted surface `~#1A1A1A` |
| Text | `~#FAFAFA`; muted text `~#A6A6A6`; borders `~#262626` |
| Destructive | `~#EF4444` |
| Lime gradient | `linear-gradient(135deg, #C7F011, ~#A4E80B)`; lime glow shadow `0 0 40px rgba(199,240,17,0.3)` |
| Font — body/UI | **DM Sans** |
| Font — headings | **Bricolage Grotesque** |
| Font — numbers/stats | **JetBrains Mono** (tabular-nums) |

Load fonts with `expo-font` / `@expo-google-fonts/{dm-sans,bricolage-grotesque,jetbrains-mono}`.
Brand assets live in the web repo `src/assets/` (`padel2go-logo.png`, `padel2go-wordmark.png`,
`p2g-app-icon.png` for the app icon, etc.) — copy the ones you need.

---

## 5. Gotchas / must-knows (read before coding)

1. **Never embed the `service_role` key.** Anon key + user JWT only. Money mutations go through edge functions.
2. **`types.ts` in the web repo is stale** — generate fresh types from `wvvdkuextsbsecqbfksb` (§1.4).
3. **`localStorage` / `window` / `detectSessionInUrl` don't exist in RN** — use the client in §1.2.
4. **Add the app's deep-link redirect URLs** to Supabase Auth → URL Configuration, or email
   confirm / reset / email-change will fail (§1.3). Use `flowType: 'pkce'`.
5. **Email confirmation is ON** — after signup there's no session until the email link is clicked.
6. **Times are UTC `timestamptz`** in `bookings.start_time` — store `.toISOString()`, display in Europe/Berlin.
7. **Wallet is read-only for the client**; `play_credits` is THE points balance (reward_credits legacy 0).
8. **Payments** = open Stripe Checkout URL in an in-app browser, then poll booking/order status
   (the webhook confirms async). The `{ free: true }` path is already confirmed server-side.
9. **Feature flags** are 3-state (`visible`/`demo`/`hidden`) in `site_settings` row `id='global'`.
   `RequireAppLaunched` is dead — don't reimplement it.
10. **Push notifications don't exist yet** — build `device_tokens` + expo-notifications + a push
    helper (§3.6.2); this is the only genuinely new backend piece for the scoped app.

---

## 6. Suggested build order
1. Supabase client + auth (login/register/confirm/reset) + session persistence (§1.2–1.3).
2. Mein P2G home (read-only queries) — proves the shared backend end-to-end (§3.1).
3. Mein Profil incl. Sicherheit (profile read/update, avatar, email/password change) (§3.5).
4. Notifications (read + realtime + mark-read; bell UI) (§3.6.1).
5. Booking flow incl. Stripe-in-browser + poll (§3.2, §2.2).
6. Marketplace (§3.3) and Events (§3.4).
7. Push notifications (device_tokens + expo-notifications + backend push helper) (§3.6.2).
