# Backend Visibility & Wiring — Web → App Parity (Launch Config)

**Purpose:** the Expo/RN app talks to the **same Supabase project with the same anon key** as the
website. This document is the exact, verified spec of *what is viewable to whom* for **locations,
bookable courts, news, marketplace products, and events**, plus the global feature-flag / admin
layer. Replicate this in the app to get identical launch behaviour.

Source of truth: the live migrations in `supabase/migrations/` + the web hooks/components. Verified
2026-07-22.

---

## 0. Golden rules (read first)

1. **RLS is the shared data boundary, but it is NOT the whole visibility story.** Several
   "hidden from users" rules are enforced **only client-side** on the web. The anon key returns
   *more* rows than the UI shows. **If the app just queries the table, it will over-expose data.**
   You must re-implement the same client filters. The four traps:

   | Rule that is **client-only** (RLS does NOT enforce it) | App MUST add |
   |---|---|
   | Courts hidden pre-launch (`feature_courts_public_enabled=false`) | check the flag before querying |
   | Bookable court `is_active=true` | `.eq('is_active', true)` |
   | Marketplace `status != 'draft'` | `.neq('status','draft')` / drop drafts |
   | Article `audience` (logged_in/logged_out) | `.in('audience', [surface,'everyone'])` |
   | Event `featured` hero pick | client-side pick, not a filter |

2. **RLS *does* hard-enforce these** (anon simply gets zero rows — safe even if the app forgets):
   - `locations.is_online = true` (offline venues invisible to non-admins)
   - `marketplace_items.is_active = true` (inactive products invisible)
   - `articles.is_published = true` (drafts invisible)
   - `events.is_published = true` (drafts invisible)
   - `location_teasers.is_active`, `marketplace_categories/brands.is_active`

3. **`feature_app_launched` is DEAD.** The old "master launch switch" and all the
   `feature_*_enabled` booleans documented in CLAUDE.md/`types.ts` are **never read** in live code.
   There is **no** `RequireAppLaunched`. Do **not** gate anything on them.

4. **Admin bypass is client-side** for the `isAdmin` boolean, but **RLS `has_role()` requires a
   real `user_roles` admin row** — the superadmin email holder has both.

5. **Booking + Marketplace + Events public pages need NO login.** Only the logged-in dashboard
   surfaces and admin panel require auth.

---

## 1. Admin identity — how to compute `isAdmin` (needed everywhere)

Mirror `useAdminAuth`:

```ts
const SUPERADMIN_EMAILS = ['fsteinfelder@padel2go.eu'];

async function resolveIsAdmin(user) {
  if (!user) return false;                                  // anon = never admin
  if (SUPERADMIN_EMAILS.includes(user.email)) return true;  // hard-coded bypass, no DB hit
  const { data } = await supabase
    .from('user_roles').select('role')
    .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  return !!data;                                            // real user_roles admin row
}
```

**RLS on `user_roles`:** anon has **no SELECT policy** (gets zero rows); a logged-in user can read
**only their own** rows (`user_id = auth.uid()`); admins read all. So never try to read `user_roles`
while anonymous — it returns nothing by design.

---

## 2. Feature flags — 3-state model (`site_settings`)

**One row**, `site_settings` with `id = 'global'`. **RLS SELECT is `USING (true)`** → the anon key
can read all flags (the app needs this). Only admins can UPDATE.

Each managed feature has a **text** column `feature_<name>_state` with values
`'visible' | 'demo' | 'hidden'` (CHECK-constrained, default `'hidden'`):

`feature_lobbies_state`, `feature_league_state`, `feature_events_state`, `feature_matching_state`,
`feature_p2g_state`, `feature_marketplace_state`, `feature_friends_state` (+ `feature_rewards_state`, unused).

**Seeded `'visible'`:** events, friends, marketplace, p2g. **Seeded `'hidden'`:** lobbies, league, matching.

**The rule (mirror `useFeatureToggles` + `canSee`):**

```ts
// one query, no auth needed:
const { data } = await supabase.from('site_settings')
  .select('feature_lobbies_state, feature_league_state, feature_events_state, feature_matching_state, feature_p2g_state, feature_marketplace_state, feature_friends_state')
  .eq('id', 'global').maybeSingle();

const norm = v => (v === 'visible' || v === 'demo') ? v : 'hidden';
const canSee = (feature) => {
  const s = norm(data[`feature_${feature}_state`]);
  return s === 'visible' || (s === 'demo' && isAdmin);
};
```

- `visible` → shown to **all logged-in users**
- `demo` → shown to **admins only** (normal users: nav link hidden + route redirects)
- `hidden` → hidden from **everyone incl. admins** (admin does **not** bypass `hidden`)

**What the flags actually gate on web (important nuance):**
- **Route-gated** (redirect to /dashboard if `!canSee`): **only** `lobbies`, `p2g`, `league`.
- **Nav-link only** (route itself is reachable/public regardless): `events`, `friends`, `marketplace`.
- So for the app: gate **screens** for lobbies/p2g/league; for events/friends/marketplace use the flag
  **only to show/hide a nav entry** — never to filter the underlying data.

Admin toggle: **`/admin/features`** (`AdminFeatures.tsx`) — a `<Select>` per feature
(`Für alle sichtbar` / `Demo (nur Admin)` / `Aus`) → writes `feature_<name>_state`.

While `isAdmin` or the flags are still loading, **block render / show spinner** — otherwise a `demo`
feature briefly flashes for non-admins.

---

## 3. Locations (two DIFFERENT things)

### 3a. `locations` — real bookable venues
- **Visibility column:** `is_online` (boolean, **DEFAULT `false`**). A **new location is hidden**
  until an admin turns it Online.
- **RLS SELECT:** `USING (is_online = true OR public.has_role(auth.uid(), 'admin'))`
  → anon/normal users see only online venues; **admins see offline ones too** (admin-only visibility).
- **Also gated by the global courts flag** (see §4) — pre-launch, non-admins see none at all.
- **Admin toggle:** `/admin/courts` → Standorte tab → Online/Offline switch → `locations.is_online`.
- **Public query:** `from('locations').select('*').eq('is_online', true)` (no explicit order).
- **Detail:** `from('locations').select('*').eq('slug', slug).maybeSingle()` (no `is_online` filter —
  relies on RLS; anon gets null for offline → redirect to list).

### 3b. `location_teasers` — marketing "coming soon" cards (homepage only)
- **NOT bookable.** No courts, no slug booking. Pure marketing rows with `_en` i18n columns.
- **Visibility column:** `is_active` (boolean, **DEFAULT `true`** → a new teaser shows immediately).
- **RLS SELECT:** `USING (is_active = true OR has_role(auth.uid(),'admin'))`.
- **Admin toggle:** `/admin/location-teasers` → is_active switch (+ sort_order, `_en` fields).
- **Public query:** `from('location_teasers').select('*').eq('is_active', true).order('sort_order', {ascending:true})`.
- Render as non-clickable info cards; optional external `club_url` link. **Never feed into the booking flow.**

---

## 4. Bookable courts + booking flow ⚠️ (the "only admins can see courts" case)

**KEY FACT:** courts RLS is **`"Anyone can view courts" USING (true)`** — every court (active or
not) is readable by the anon key. **All court gating is CLIENT-SIDE.** The app must replicate it.

**Three layers gate a court's public visibility:**

1. **Global flag** `site_settings.feature_courts_public_enabled` (boolean, **DEFAULT `false`**).
   This is a **separate** flag, *not* part of the §2 feature-state model.
   - `false` (default, pre-launch): **only admins** see courts. Every non-admin gets a
     **"Bald verfügbar / Coming Soon"** screen and the web runs **no** court/location query.
   - `true`: all users see online courts.
   - `canSeeCourts = isAdmin || feature_courts_public_enabled`. Admins get an "Admin-Vorschau" badge.
   - Admin toggle: `/admin/features` → "Online-Courts öffentlich sichtbar" switch.
2. **Parent location** must be `is_online = true` (§3a) — RLS + `.eq('is_online', true)`.
3. **Court** must be `is_active = true` — **query filter only** (`.eq('is_active', true)`); RLS does
   NOT hide inactive courts, so **you must add this filter** or you leak offline courts.
   - New court `is_active` **DEFAULT `true`**. Admin toggle: `/admin/courts` → Courts tab → Online/Offline.
   - `courts.label` (nullable) = optional badge under the court name; cosmetic.

**Route guard:** NONE. `/booking`, `/booking/locations/:slug`, checkout/success/cancel are **fully
public** (guest checkout supported). Gating is inside the page via the `useCourtsVisibility` hook.

**Exact public queries to mirror:**
```ts
// STEP 0 — gate (before ANY court query):
const { data: ss } = await supabase.from('site_settings')
  .select('feature_courts_public_enabled').eq('id','global').maybeSingle();
const canSeeCourts = isAdmin || (ss?.feature_courts_public_enabled ?? false);
if (!canSeeCourts) return <ComingSoon/>;                 // do NOT query further

// LOCATION LIST:
from('locations').select('*').eq('is_online', true);     // no order
// per location:
from('courts').select('id').eq('location_id', loc.id).eq('is_active', true);   // ALWAYS .eq is_active
from('court_prices').select('price_cents').in('court_id', courtIds).eq('duration_minutes', 60)
  .order('price_cents',{ascending:true}).limit(1);        // fallback: court_id IS NULL

// LOCATION DETAIL:
from('locations').select('*').eq('slug', slug).maybeSingle();
from('courts').select('*').eq('location_id', id).eq('is_active', true);  // auto-select courts[0]

// SLOT AVAILABILITY — use the VIEW, never `bookings` directly (it hides user_id/PII):
from('booking_availability').select('start_time, end_time')
  .eq('court_id', selectedCourt).gte('start_time', dayStart).lt('start_time', dayEnd);
```
- Slots are generated **in JS** from `locations.opening_hours_json[dayName] {open,close}` in 30-min
  steps for the chosen duration (30/60/90); a slot is available = not past AND not overlapping a
  `booking_availability` row. Cap ~50 slots.
- `booking_availability` (security_invoker view) returns `court_id, location_id, start_time,
  end_time, status` for `status='confirmed'` OR non-expired `pending_payment` holds
  (`hold_expires_at > now()`).
- A court needs a full price set (≥3 rows / non-null price for the duration) to be bookable.

---

## 5. News / Articles (`public.articles`)

**Visibility = `is_published` (RLS) + `audience` (client filter).**

- **`is_published`** (boolean, **DEFAULT `false`**). **RLS SELECT `USING (is_published = true)`** for
  everyone; a second policy lets admins read drafts. → drafts are true admin-only.
- **`audience`** (text `'everyone' | 'logged_in' | 'logged_out'`, DEFAULT `'everyone'`). **NOT
  enforced by RLS** — pure client filter. `everyone`=both surfaces; `logged_out`=public home only;
  `logged_in`=dashboard only.
- **`sort_order`** (DESC primary) + **`published_at`** (DESC secondary; stamped on first publish).
- **No feature flag, no route guard.** Feed self-hides when 0 rows.
- **Admin:** `/admin/news` — publish switch, "Sichtbar für" audience select, sort_order, content.

**Exact query (per surface — mirror `useArticles`):**
```ts
from('articles').select('*')
  .eq('is_published', true)
  .in('audience', [surface, 'everyone'])   // surface: 'logged_out' (public home) | 'logged_in' (dashboard)
  .order('sort_order', { ascending: false })
  .order('published_at', { ascending: false });
```
- **Public/unauthenticated home feed** → `surface='logged_out'`.
- **Logged-in home/dashboard feed** → `surface='logged_in'`.
- The `.in('audience', …)` filter is **mandatory** — RLS only enforces `is_published`.
- Display: cover_image_url (fallback placeholder), title, `published_at` date, excerpt (clamp 3),
  expandable `body_html` (render HTML), `source_url` → "Zur Quelle" external link.
- i18n: use `*_en` (`title_en/excerpt_en/body_html_en`) when EN and non-empty, else DE.

---

## 6. Marketplace products (`marketplace_items`)

**Two gates that BOTH must pass for public visibility:**

1. **`is_active = true`** — **RLS-enforced** (`USING (is_active = true OR has_role(...,'admin'))`)
   **and** query-filtered. Inactive = true admin-only. DEFAULT `true`.
2. **`status != 'draft'`** (`status` text, `'draft'|'published'`, DEFAULT `'published'`) — **client
   filter only** (`.neq('status','draft')` / `status !== 'draft'`). **RLS does NOT check status → an
   active draft IS returned by the anon key; the app MUST drop it.**

Plus a **de-facto gate on the shop list:** non-null `slug` (`!!p.slug`). Products without a slug
never appear in the grid and have no detail page (older seed rows have no slug).

- `is_featured` → "Bestseller" badge + "pop" sort (not visibility). `stock_quantity` → sold-out/low
  UI (NULL = always in stock).
- **Categories/brands** each have their own `is_active` (RLS `USING (is_active = true OR admin)` +
  `.eq('is_active', true)`) → inactive ones drop as filter chips. **Brand names are NOT translated.**
- **Product images** `marketplace_item_images`: RLS `USING (true)` (world-readable); only practically
  hidden because the parent product is hidden.

**Feature flag:** `feature_marketplace_state` (§2) gates **only** the logged-in dashboard nav link.
The **`/marketplace` shop, product pages, and product data are fully PUBLIC** regardless of the flag
and regardless of app-launch. Route guard: none on the shop.

**Exact public queries (mirror `useMarketplaceItems` / `useMarketplaceProduct`):**
```ts
// SHOP LIST:
from('marketplace_items').select('*').eq('is_active', true)
  .order('sort_order',{ascending:true}).order('created_at',{ascending:false});
// then in app code (RLS won't do it):
items.filter(p => !!p.slug && p.status !== 'draft');
// sort 'pop' = is_featured desc, then sort_order asc; price sorts use price_cents.

// PRODUCT DETAIL (by slug):
from('marketplace_items').select('*')
  .eq('slug', slug).eq('is_active', true).neq('status','draft').maybeSingle();
from('marketplace_item_images').select('*').eq('item_id', id).order('sort_order',{ascending:true});
// related: active, non-draft, other items, is_featured desc → sort_order asc, prefer same category, cap 3.

// CATEGORIES / BRANDS (chips + labels):
from('marketplace_categories').select('*').eq('is_active', true).order('sort_order',{ascending:true});
from('marketplace_brands').select('*').eq('is_active', true).order('sort_order',{ascending:true});
```
- Resolve `brand_id → brand.name` (fallback `partner_name` → "P2G"), `category_id → category.name`
  (fallback "Kategorie"/"Equipment").
- Prices in cents; `compare_at_price_cents` = UVP/strikethrough. i18n via `*_en` (name/subtitle/
  description/long_description/meta_*); brands not translated; `specs` (jsonb) rendered in German.

---

## 7. Events (`events`)

**Visibility = single boolean `is_published`.**

- **`is_published`** (boolean, **DEFAULT `false`** → new events are drafts). **RLS SELECT
  `USING (is_published = true)`**; admins also see drafts via a second policy. True admin-only for drafts.
- **`featured`** (boolean) — **client-side hero pick only**, not a filter: hero = first row with
  `featured===true && start_at` in the future, else next upcoming. A non-featured published event
  still shows in the grid.
- **`start_at`** — ordering (ascending) + client past/upcoming filter (`isPast`, hidden unless a
  "show past" toggle is on).
- **Joined `event_artists` / `event_brands`:** RLS ties them to the parent being published
  (`EXISTS(... events.is_published = true)`) → a draft never leaks its line-up.
- **`event_registrations`** (in-app free booking): RLS SELECT `USING (auth.uid() = user_id OR
  admin)` → a user reads **only their own**; anon reads none. Writes **only** via SECURITY DEFINER
  RPCs `register_for_event` / `cancel_event_registration` (authenticated-only, capacity-checked,
  re-validate `is_published`). Public "spots left" comes from denormalized `registrations_count`.
- **`ticket_url`** is OPTIONAL (free in-app events need none). `price_cents` → free vs paid gating.

**Feature flag:** `feature_events_state` (§2) gates **only** the dashboard nav link. Public `/events`
+ `/events/:slug` are **not** feature-gated; `/dashboard/events` is behind login only (deliberately
**not** `RequireFeature`). **Do not gate the Events screens on any flag** to match web.

**Exact public queries (mirror `Events.tsx` / `EventDetail.tsx`):**
```ts
// PUBLIC LIST:
from('events').select(`
  id, title, slug, description, city, start_at, end_at, image_url, ticket_url, event_type,
  price_label, highlights, featured, venue_name,
  locations:location_id (name),
  event_artists (id, name, role, image_url, instagram_url),
  event_brands (id, name, brand_type, logo_url)
`).eq('is_published', true).order('start_at', { ascending: true });

// DETAIL (match UUID on id else slug):
from('events').select('<richer fields incl. price_cents, capacity, location_url, address_line1, postal_code, locations:location_id(name,address), full artist/brand fields>')
  .eq('is_published', true);   // then .eq('id', slug) if UUID_REGEX else .eq('slug', slug); .single()

// IN-APP DASHBOARD LIST (logged-in): from('events').select('*').eq('is_published', true).order('start_at',{ascending:true})
// MY REGISTRATIONS (requires user):
from('event_registrations').select('id, event_id, ticket_code, created_at, event:events(*)')
  .eq('status','confirmed').order('created_at', { ascending: false });
// REGISTER / CANCEL:
supabase.rpc('register_for_event', { p_event_id });
supabase.rpc('cancel_event_registration', { p_event_id });
```
- i18n via `*_en` (`title_en/description_en/price_label_en/highlights_en`) with DE fallback.
- After register/cancel, invalidate events + my-registrations caches. Confirmation/cancellation
  emails are fire-and-forget edge fns (`send-event-confirmation` / `send-event-cancellation`) — never
  block booking on them.

---

## 8. Defaults cheat-sheet (what a freshly-created row does)

| Entity | New-row default | Visible to public immediately? |
|---|---|---|
| `locations.is_online` | **false** | ❌ admin-only until toggled Online (+ courts flag on) |
| `location_teasers.is_active` | **true** | ✅ shows on homepage |
| `courts.is_active` | **true** | ✅ if location online + courts flag on |
| `site_settings.feature_courts_public_enabled` | **false** | ❌ pre-launch: courts admin-only |
| `articles.is_published` | **false** | ❌ draft, admin-only |
| `articles.audience` | 'everyone' | both surfaces (once published) |
| `marketplace_items.is_active` | **true** | needs also status≠draft **and** a slug |
| `marketplace_items.status` | **'published'** | ✅ (if active + slug) |
| `events.is_published` | **false** | ❌ draft, admin-only |
| `events.featured` | false | listed but not hero |

---

## 9. Admin panel → what each toggle controls (quick map)

| Admin page | Control | Column | Effect |
|---|---|---|---|
| `/admin/features` | per-feature Select (visible/demo/hidden) | `feature_<name>_state` | route+nav for lobbies/p2g/league; nav-only for events/friends/marketplace |
| `/admin/features` | "Online-Courts öffentlich sichtbar" switch | `feature_courts_public_enabled` | global courts on/off for non-admins |
| `/admin/features` | Launch-Datum | `launch_date` | homepage countdown only (not a gate) |
| `/admin/courts` → Standorte | Online switch | `locations.is_online` | venue public vs admin-only |
| `/admin/courts` → Courts | Online switch | `courts.is_active` | court in booking flow vs hidden (client filter) |
| `/admin/location-teasers` | Active switch | `location_teasers.is_active` | marketing card on homepage |
| `/admin/news` | Veröffentlicht switch | `articles.is_published` | live vs draft |
| `/admin/news` | Sichtbar für | `articles.audience` | which surface (client filter) |
| `/admin/marketplace` | Aktiv switch | `marketplace_items.is_active` | hard on/off (RLS) |
| `/admin/marketplace` | Status select (Live/Entwurf) | `marketplace_items.status` | published vs draft (client filter) |
| `/admin/marketplace` | category/brand active | `..._categories/brands.is_active` | filter chip on/off |
| `/admin/events` | Status switch | `events.is_published` | live vs draft |
| `/admin/events` | Featured switch | `events.featured` | hero pick (client) |

---

**One-line summary for the app:** *Query the same tables with the same filters the web hooks use;
trust RLS for `is_online`/`is_published`/`is_active`; but re-implement the four client-only gates
(courts flag, court `is_active`, marketplace `status`/`slug`, article `audience`) yourself, because
the shared anon key returns more than the UI is allowed to show. Ignore `feature_app_launched`
entirely; use the 3-state `feature_<name>_state` model only where noted.*
