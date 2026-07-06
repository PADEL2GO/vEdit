# Newsletter — Design Spec

**Date:** 2026-07-06
**Status:** Approved (design), pending spec review
**Owner:** Florian Steinfelder

## Goal

Let an admin compose a branded newsletter in the admin panel (block-based composer),
and send it as a bulk campaign to all confirmed newsletter subscribers via Resend.
Includes legally-required double opt-in on signup and a working unsubscribe link.

## Decisions (resolved during brainstorming)

- **Composer:** block-based (stack Heading / Text / Image / Button blocks), rendered into the P2G branded template. Not WYSIWYG.
- **Send engine:** self-managed — subscribers stay in our DB, sent via Resend in batches, our template, our unsubscribe token. (Not Resend Broadcasts/Audiences.)
- **Opt-in:** double opt-in (confirmation email on signup). Existing subscribers grandfathered as confirmed.
- **Sender:** `PADEL2GO <info@padel2go-official.de>` (same verified identity as transactional mail; reuses `_shared/email.ts`).

## Non-goals (YAGNI, v1)

- No segmentation/targeting — send to all confirmed subscribers.
- No scheduling — "send now" only.
- No open/click analytics dashboards (Resend's own logs suffice).
- No A/B testing, no WYSIWYG editor, no multi-language (German only).

---

## Data model

### `newsletter_subscribers` (existing — extend)

Existing: `id uuid pk, email text unique, source text, created_at timestamptz`.

Add columns (all `IF NOT EXISTS`):
- `unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid()` — unique; used in the unsubscribe link.
- `confirm_token uuid NOT NULL DEFAULT gen_random_uuid()` — unique; used in the double-opt-in confirm link.
- `confirmed_at timestamptz` — set when the subscriber confirms (double opt-in). `NULL` = unconfirmed.
- `unsubscribed_at timestamptz` — set on unsubscribe. `NULL` = still subscribed.

Backfill (grandfather existing rows): `UPDATE newsletter_subscribers SET confirmed_at = created_at WHERE confirmed_at IS NULL;`
Unique indexes on `unsubscribe_token` and `confirm_token`.

**Eligible to receive a campaign:** `confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`.

### `newsletter_campaigns` (new)

- `id uuid pk default gen_random_uuid()`
- `subject text not null`
- `preheader text` — optional inbox preview line
- `blocks jsonb not null default '[]'` — the composer content (see Block schema)
- `status text not null default 'draft'` — `draft | sending | sent | failed`
- `recipient_count int not null default 0` — snapshot at launch
- `sent_count int not null default 0`
- `failed_count int not null default 0`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `sent_at timestamptz`

### `newsletter_sends` (new — per-recipient idempotency + log)

- `id uuid pk default gen_random_uuid()`
- `campaign_id uuid not null references newsletter_campaigns(id) on delete cascade`
- `subscriber_id uuid not null references newsletter_subscribers(id) on delete cascade`
- `email text not null` — snapshot
- `status text not null` — `pending | sent | failed`
- `error text`
- `created_at timestamptz not null default now()`
- `sent_at timestamptz`
- `UNIQUE (campaign_id, subscriber_id)` — the idempotency guard

### RLS

- `newsletter_campaigns`, `newsletter_sends`: admin-only for ALL (SELECT/INSERT/UPDATE/DELETE), predicate `has_role(auth.uid(),'admin') OR jwt email = superadmin`. Edge functions use service role.
- `newsletter_subscribers`: keep existing (anon INSERT, admin SELECT/DELETE). Signup routes through the `newsletter-subscribe` edge function so the confirm email is sent; a raw anon insert just creates an unconfirmed row that never receives mail (safe).

### Storage

- Reuse the existing public `media` bucket (the codebase's established upload target), under a `newsletter/` path prefix. Block images store the public URL. No new bucket needed.

---

## Block schema (`blocks` jsonb)

Ordered array; each block one of:
```json
{ "type": "heading", "text": "Winter-Liga 2026" }
{ "type": "text",    "text": "Ab Januar geht's los ..." }
{ "type": "image",   "url": "https://.../court.jpg", "alt": "Court" }
{ "type": "button",  "label": "Jetzt anmelden", "url": "https://www.padel2go-official.de/liga" }
```
All user text is HTML-escaped at render. `text` blocks preserve line breaks (`\n` → `<br>`).

---

## Rendering

New helper `_shared/newsletter.ts` (keeps `email.ts` focused; imported only by `newsletter-send`):
`renderNewsletterHtml(campaign, { unsubscribeUrl })` → full branded HTML. Reuses the brand tokens/shell style of `brandedEmailHtml`.

- Reuses the P2G shell (near-black `#0a0a0a`, card `#101010`, lime `#C7F011`, wordmark header).
- Renders blocks in order: heading (lime H2), text (paragraph, escaped, `<br>`), image (responsive `max-width:100%`), button (lime pill CTA).
- **Mandatory footer:** company identity + `Impressum` link + **Abmelden** link (`unsubscribeUrl`). Also emit the `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers via Resend's `headers` option for 1-click unsubscribe in Gmail/Apple Mail.

---

## Flows & edge functions

### 1. Signup + double opt-in — `newsletter-subscribe` (public, verify_jwt=false)
- Input `{ email, source? }`. Validate email, IP rate-limit (reuse `rate_limit_log`).
- Upsert subscriber (unconfirmed): if new, insert; if exists and unconfirmed, keep/rotate `confirm_token`; if already confirmed, return "already subscribed" (no email).
- Send double-opt-in confirmation email (branded): "Bitte bestätige deine Anmeldung" → link `https://www.padel2go-official.de/newsletter/bestaetigen?token=<confirm_token>`.
- `NewsletterCTA.tsx` changes from a direct `.insert()` to `supabase.functions.invoke("newsletter-subscribe", ...)`.

### 2. Confirm — `newsletter-confirm` (public, verify_jwt=false)
- Input `{ token }`. Sets `confirmed_at = now()` where `confirm_token = token AND confirmed_at IS NULL`. Idempotent.
- Frontend route `/newsletter/bestaetigen` renders a branded status page calling this.

### 3. Unsubscribe — `newsletter-unsubscribe` (public, verify_jwt=false)
- Input `{ token }`. Sets `unsubscribed_at = now()` where `unsubscribe_token = token`. Idempotent (already-unsubscribed = success).
- Frontend route `/newsletter/abmelden` renders a branded status page calling this. Supports one-click POST for the `List-Unsubscribe` header.

### 4. Send — `newsletter-send` (verify_jwt=false; in-code auth: admin JWT for the initial trigger OR service-role bearer for self-continue)
Two modes:
- **Test:** `{ campaign_id, test_to }` → renders + sends ONE email to `test_to` (defaults to the admin's own email). Does not touch subscribers/counters. (This is also our external delivery test.)
- **Launch:** `{ campaign_id }` →
  1. First call (admin): set `status='sending'`, snapshot `recipient_count` = count of eligible subscribers.
  2. Select up to N (≈100) eligible subscribers **not yet** in `newsletter_sends` for this campaign.
  3. Claim them: insert `newsletter_sends` rows `status='pending'` (UNIQUE prevents a concurrent/re-run double-claim).
  4. `resend.batch.send(...)` the batch (each mail its own recipient + unique unsubscribe URL + `List-Unsubscribe` header). Update each send row to `sent`/`failed` + campaign counters.
  5. If more eligible remain: self-invoke `newsletter-send` with a service-role bearer to process the next batch (avoids the ~150s function timeout). Else set `status='sent'`, `sent_at=now()`.
- Resend errors are surfaced (mirrors the hardened `sendBrandedEmail`) so failures are logged, not silent.

`config.toml`: register the 4 functions (`newsletter-subscribe`, `newsletter-confirm`, `newsletter-unsubscribe` → verify_jwt=false; `newsletter-send` → verify_jwt=false with in-code auth).

---

## Admin UI — `AdminNewsletter.tsx` at `/admin/newsletter`

- Sidebar entry "Newsletter" (icon: Mail/Send).
- **Composer:** subject + preheader inputs; block list with add (Heading/Text/Image/Button), inline edit, reorder (up/down), delete; image blocks upload to `newsletter-images`. **Live preview** pane rendering the branded mail.
- **Actions:** Save draft (upsert campaign); "Test an mich" (calls send/test); "An alle senden" (confirm dialog → send/launch), with live counters.
- **Subscribers:** confirmed / unconfirmed / unsubscribed counts.
- **Campaign history:** past campaigns with status + counters + sent_at.
- Guarded by existing `AdminLayout` + `useAdminAuth`.

---

## Testing

- Unit-render `renderNewsletterHtml` for each block type + escaping.
- `newsletter-send` idempotency: re-running a launch never double-sends (UNIQUE guard).
- Confirm/unsubscribe token flows idempotent.
- Manual: test-send to an external Gmail (also validates external Resend delivery), then a real launch to a tiny confirmed test set.

## Rollout

- Migration adds columns + tables + backfill + storage bucket. Must run in Supabase.
- Deploy the 4 new edge functions (`newsletter-send` bundles the new `_shared/newsletter.ts`).
- Frontend (composer page, 2 public routes, NewsletterCTA change) ships via push to `main` → Vercel.
