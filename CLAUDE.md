# CLAUDE.md — PADEL2GO

## Project
German padel court booking + community platform. Pre-launch phase as of April 2026.
**Owner:** Florian Steinfelder (Managing Partner, non-technical)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router DOM v7 |
| UI | Tailwind CSS + shadcn/ui |
| State | TanStack React Query |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions on Deno) |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Animations | Framer Motion |

---

## Architecture

### Auth & Route Guards
- `RequireAuth` — wraps all routes needing login. Shows spinner while loading, redirects to `/auth?redirect=<path>` if no user.
- `RequireAppLaunched` — wraps routes hidden until admin flips `feature_app_launched`. Admins always pass through immediately.
- `useAdminAuth` — checks `user_roles` table + hardcoded superadmin email bypass for `fsteinfelder@padel2go.eu`.

### Feature Flags
All flags live in `site_settings` table (single row, id = `global`):
- `feature_app_launched` — master switch; when false, logged-in users only see `/booking`
- `feature_lobbies_enabled`, `feature_p2g_enabled`, `feature_marketplace_enabled`, `feature_league_enabled`, `feature_events_enabled`, `feature_rewards_enabled`, `feature_friends_enabled`, `feature_matching_enabled`

Hook: `useFeatureToggles()` — reads all flags, used in `DashboardNavigation` and `RequireAppLaunched`.

### Edge Functions
Located in `supabase/functions/`. Pattern: try `Deno.env.get("KEY")` first, then fall back to `site_integration_configs` DB table.
Key functions: `create-checkout-session`, `stripe-webhook`, `send-booking-confirmation`, `send-contact-email`, `send-invite-notification`, `integrations-admin-api`.

### Admin Panel
22 pages at `/admin/*`. Always accessible to admins regardless of `app_launched`. Protected by `AdminLayout` + `useAdminAuth`.

---

## Development Workflow

### Before starting any task
1. Read the relevant files first — never suggest changes without reading current code
2. For features touching DB schema: check existing migrations before writing new ones
3. For tasks touching auth/routing: re-read `RequireAuth`, `RequireAppLaunched`, `App.tsx`

### Code Rules
- **No speculative code** — only build what was asked, no future-proofing
- **No visual changes** unless explicitly requested
- **No new files** unless absolutely necessary — prefer editing existing ones
- **No error handling** for impossible scenarios — trust framework guarantees
- **No comments** unless logic is non-obvious
- **No backwards-compat shims** — if something is unused, delete it
- Security-first: no SQL injection, XSS, command injection — validate at system boundaries only

### Mobile
All layouts must work on 320px–375px screens. Use `sm:` prefixes for anything that would break at mobile widths (3+ column grids, large fixed sizes, etc.).

### TypeScript
- Prefer strict types; use `as any` only as last resort with a comment
- New DB columns not yet in `types.ts`: cast with `(data as any)?.column` temporarily

### Supabase Migrations
- File naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Always use `IF NOT EXISTS` for ADD COLUMN
- After writing migration, remind Florian to run it in Supabase SQL editor

---

## Key Files

```
src/
  App.tsx                          — Route definitions, all guards wired here
  components/
    RequireAuth.tsx                — Login gate
    RequireAppLaunched.tsx         — Launch mode gate
    Navigation.tsx                 — Public nav (switches to DashboardNavigation when logged in)
    DashboardNavigation.tsx        — Logged-in nav, respects feature flags
    Footer.tsx                     — 4-column footer: Brand | Plattform | Unternehmen | Rechtliches
    admin/AdminSidebar.tsx         — Admin nav links
  hooks/
    useAuth.ts                     — Supabase auth session
    useAdminAuth.ts                — Admin role check
    useFeatureToggles.ts           — All feature flags from site_settings
    useClubAuth.ts                 — Club owner role check
  pages/admin/
    AdminFeatures.tsx              — Toggle all feature flags + master app_launched switch
    AdminIntegrations.tsx          — Configure Stripe / Resend / PayPal / App URL
  integrations/supabase/
    client.ts                      — Supabase JS client
    types.ts                       — Auto-generated DB types (update after migrations)
supabase/
  functions/                       — Deno edge functions
  migrations/                      — SQL migration files
```

---

## Git
- Remote `origin` → https://github.com/PADEL2GO/vEdit.git
- Remote `padel2go` → https://github.com/PADEL2GO/padel2go-edit-8beb07f0.git
- Push to both after significant changes
- Use `/commit` for structured commit messages

---

## Pending Migrations (not yet run in production)
- `20260411000001_add_app_launched_toggle.sql`
- `20260411000002_add_integration_configs.sql`
- `20260411000003_add_page_feature_toggles.sql`
