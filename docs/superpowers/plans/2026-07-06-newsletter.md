# Newsletter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin-composed, double-opt-in bulk newsletter over Resend, with a working unsubscribe.

**Architecture:** Subscribers live in our DB (`newsletter_subscribers`). Admin composes a block-based campaign in `/admin/newsletter`; a service-role edge function (`newsletter-send`) renders the P2G template and sends in batches via Resend. Signup goes through `newsletter-subscribe` (double opt-in); `newsletter-confirm` / `newsletter-unsubscribe` handle token links.

**Tech Stack:** Supabase (Postgres + Deno edge functions), React 18 + Vite + TS + Tailwind/shadcn, Resend, existing `_shared/email.ts` helper. **No unit-test framework exists** — verification is via `npm run build`, `npm run lint`, `supabase functions deploy`, curl smoke tests, and DB checks.

---

## Post-review hardening (2026-07-06, supersedes original Task 1 §helpers + Task 6 code)

An adversarial review found a critical security hole + a data-loss bug in the first send design. The migration + `newsletter-send` were revised (see the actual files for the source of truth):
- **Security:** the `SECURITY DEFINER` SQL functions now `REVOKE ALL … FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE … TO service_role` (repo convention). Without this the anon key could dump the whole subscriber list + unsubscribe tokens.
- **Send engine:** replaced the fragile all-or-nothing `batch.send` + `next_batch`/`bump_counters` with a **per-recipient** `emails.send` loop and a single atomic `newsletter_claim_batch(p_campaign_id, p_limit)` RPC. `newsletter_sends` gains an `attempts` column; a failed/orphaned send stays retryable (re-armed attempts+1) until 3 attempts, so a transient Resend error no longer permanently drops recipients or falsely reports the campaign as `sent`. `newsletter_progress` (live sent_count) + `newsletter_finalize` (final counts + terminal status) replace `bump_counters`.
- **Guards:** atomic single-winner launch flip (no double-send on double-click), claim-RPC error is surfaced (no infinite self-continue spin), empty-service-key auth bypass closed, batched status writes, 350 ms send throttle.

## Shared Contracts (fixed interfaces — all tasks depend on these)

**Sender/URLs:** `PADEL2GO <info@padel2go-official.de>` (via `_shared/email.ts`). App base URL: `https://www.padel2go-official.de`.
- Confirm link: `${APP}/newsletter/bestaetigen?token=<confirm_token>`
- Unsubscribe link: `${APP}/newsletter/abmelden?token=<unsubscribe_token>`

**Storage:** existing public bucket `media`, path prefix `newsletter/`.

**`newsletter_subscribers`** (existing + new cols): `id, email, source, created_at, unsubscribe_token uuid, confirm_token uuid, confirmed_at timestamptz, unsubscribed_at timestamptz`. Eligible = `confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`.

**`newsletter_campaigns`**: `id, subject text, preheader text, blocks jsonb, status text('draft'|'sending'|'sent'|'failed'), recipient_count int, sent_count int, failed_count int, created_by uuid, created_at, sent_at`.

**`newsletter_sends`**: `id, campaign_id, subscriber_id, email text, status text('pending'|'sent'|'failed'), error text, created_at, sent_at`, `UNIQUE(campaign_id, subscriber_id)`.

**Block schema** (`blocks` jsonb array), each element exactly one of:
```ts
{ type: "heading", text: string }
{ type: "text",    text: string }
{ type: "image",   url: string, alt?: string }
{ type: "button",  label: string, url: string }
```

**Renderer** (`supabase/functions/_shared/newsletter.ts`):
`renderNewsletterHtml(campaign: { subject: string; preheader?: string; blocks: Block[] }, opts: { unsubscribeUrl: string }): string`

**Edge-function request/response** (all JSON, all with the CORS allowlist from `send-contact-email`):
- `newsletter-subscribe` (verify_jwt=false): `POST {email, source?}` → `{success:true, already?:boolean}` | `{error}`
- `newsletter-confirm` (verify_jwt=false): `POST {token}` → `{success:true}` | `{error}`
- `newsletter-unsubscribe` (verify_jwt=false): `POST {token}` → `{success:true}` | `{error}`
- `newsletter-send` (verify_jwt=false; in-code auth = admin JWT **or** service-role bearer): `POST {campaign_id, test_to?, _continue?}` → `{success, ...}`

---

## File Structure

- Create: `supabase/migrations/20260706130000_newsletter.sql`
- Create: `supabase/functions/_shared/newsletter.ts` (renderer)
- Create: `supabase/functions/newsletter-subscribe/index.ts`
- Create: `supabase/functions/newsletter-confirm/index.ts`
- Create: `supabase/functions/newsletter-unsubscribe/index.ts`
- Create: `supabase/functions/newsletter-send/index.ts`
- Modify: `supabase/config.toml` (register 4 functions)
- Create: `src/pages/NewsletterConfirm.tsx`, `src/pages/NewsletterUnsubscribe.tsx`
- Modify: `src/App.tsx` (2 public routes + 1 admin route)
- Modify: `src/components/events/NewsletterCTA.tsx` (call edge function)
- Create: `src/pages/admin/AdminNewsletter.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx` (sidebar link)

---

### Task 1: DB migration

**Files:** Create `supabase/migrations/20260706130000_newsletter.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Newsletter: double opt-in + unsubscribe on subscribers, plus campaigns + per-send log.

-- 1. Extend subscribers
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirm_token     uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at   timestamptz;

-- Grandfather existing subscribers as confirmed (they opted in before double opt-in existed).
UPDATE public.newsletter_subscribers SET confirmed_at = created_at WHERE confirmed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsub_token_idx   ON public.newsletter_subscribers (unsubscribe_token);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx ON public.newsletter_subscribers (confirm_token);

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         text NOT NULL,
  preheader       text,
  blocks          jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'draft',
  recipient_count int  NOT NULL DEFAULT 0,
  sent_count      int  NOT NULL DEFAULT 0,
  failed_count    int  NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- 3. Per-recipient send log (idempotency)
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  email         text NOT NULL,
  status        text NOT NULL,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  UNIQUE (campaign_id, subscriber_id)
);
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

-- 4. RLS: admin-only (edge functions use service role, which bypasses RLS)
CREATE POLICY "Admins manage newsletter campaigns" ON public.newsletter_campaigns
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins read newsletter sends" ON public.newsletter_sends
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));
```

- [ ] **Step 2: Apply** — paste into Supabase SQL editor and run. Expected: success, no errors. (Do NOT `supabase db push` — other pending migrations would apply too.)
- [ ] **Step 3: Verify** — in SQL editor: `SELECT confirmed_at, unsubscribe_token FROM newsletter_subscribers LIMIT 1;` returns a non-null confirmed_at + a token.
- [ ] **Step 4: Commit** — `git add supabase/migrations/20260706130000_newsletter.sql && git commit -m "feat(newsletter): db schema (double opt-in, campaigns, sends)"`

---

### Task 2: Shared renderer

**Files:** Create `supabase/functions/_shared/newsletter.ts`

- [ ] **Step 1: Write the renderer**

```ts
// Renders a block-based newsletter into the PADEL2GO branded HTML shell.
export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "button"; label: string; url: string };

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderBlock = (b: Block): string => {
  switch (b?.type) {
    case "heading":
      return `<h2 style="margin:24px 0 8px;font-size:20px;font-weight:800;color:#C7F011;">${esc(b.text)}</h2>`;
    case "text":
      return `<p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.6;">${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "image":
      return `<img src="${esc(b.url)}" alt="${esc(b.alt ?? "")}" style="display:block;width:100%;max-width:100%;border-radius:12px;margin:0 0 20px;" />`;
    case "button":
      return `<div style="text-align:center;margin:8px 0 24px;"><a href="${esc(b.url)}" style="display:inline-block;background:#C7F011;color:#000;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">${esc(b.label)}</a></div>`;
    default:
      return "";
  }
};

export function renderNewsletterHtml(
  campaign: { subject: string; preheader?: string; blocks: Block[] },
  opts: { unsubscribeUrl: string },
): string {
  const body = (campaign.blocks ?? []).map(renderBlock).join("");
  const pre = campaign.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(campaign.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(campaign.subject)}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">${pre}
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:40px 20px;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#101010;border:1px solid rgba(199,240,17,0.18);border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <tr><td style="padding:28px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:26px;font-weight:800;color:#FAFAFA;letter-spacing:-0.5px;">PADEL<span style="color:#C7F011;">2</span>GO</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">${body}</td></tr>
      <tr><td style="padding:20px 32px;background:rgba(0,0,0,0.3);text-align:center;">
        <p style="margin:0 0 6px;color:#5a5a5a;font-size:12px;">© ${new Date().getFullYear()} PADEL2GO ·
          <a href="https://www.padel2go-official.de/impressum" style="color:#8a8a8a;">Impressum</a></p>
        <p style="margin:0;color:#5a5a5a;font-size:12px;">
          Du erhältst diese E-Mail als Newsletter-Abonnent. <a href="${opts.unsubscribeUrl}" style="color:#C7F011;">Abmelden</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
```

- [ ] **Step 2: Commit** — `git add supabase/functions/_shared/newsletter.ts && git commit -m "feat(newsletter): branded block renderer"`

---

### Task 3: `newsletter-subscribe` edge function

**Files:** Create `supabase/functions/newsletter-subscribe/index.ts`; Modify `supabase/config.toml`

- [ ] **Step 1: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

const APP = "https://www.padel2go-official.de";
const allowedOrigins = [
  "https://www.padel2go-official.com","https://padel2go-official.com",
  "https://www.padel2go-official.de","https://padel2go-official.de",
  "https://padel2go.lovable.app","https://padel2go.de",
  "http://localhost:5173","http://localhost:8080",
];
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com") || origin.endsWith(".vercel.app")) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});

serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req.headers.get("origin")) });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { email, source } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return new Response(JSON.stringify({ error: "Ungültige E-Mail-Adresse" }), { status: 400, headers });

    // Rate limit by IP (reuse rate_limit_log).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await admin.from("rate_limit_log").select("*", { count: "exact", head: true })
      .eq("ip_address", ip).eq("action", "newsletter_signup").gte("created_at", since);
    if ((count ?? 0) >= 5) return new Response(JSON.stringify({ error: "Zu viele Anfragen." }), { status: 429, headers });
    await admin.from("rate_limit_log").insert({ ip_address: ip, action: "newsletter_signup" });

    const normalized = email.trim().toLowerCase();
    const { data: existing } = await admin.from("newsletter_subscribers")
      .select("id, confirm_token, confirmed_at").eq("email", normalized).maybeSingle();

    if (existing?.confirmed_at) return new Response(JSON.stringify({ success: true, already: true }), { headers });

    let confirmToken = existing?.confirm_token as string | undefined;
    if (!existing) {
      const { data: inserted, error } = await admin.from("newsletter_subscribers")
        .insert({ email: normalized, source: source ?? "website" }).select("confirm_token").single();
      if (error) throw new Error(error.message);
      confirmToken = inserted.confirm_token as string;
    }

    const resendKey = await resolveResendKey(admin);
    if (resendKey && confirmToken) {
      const html = brandedEmailHtml({
        title: "Newsletter bestätigen", emoji: "📩", heading: "Fast geschafft!",
        intro: "Bitte bestätige deine Newsletter-Anmeldung.",
        note: "Wenn du das nicht warst, ignoriere diese E-Mail einfach.",
        ctaLabel: "Anmeldung bestätigen", ctaUrl: `${APP}/newsletter/bestaetigen?token=${confirmToken}`,
      });
      await sendBrandedEmail(resendKey, normalized, "Bitte bestätige deine Newsletter-Anmeldung", html);
    }
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
```

- [ ] **Step 2: Register in config.toml** — add under the send-* block:

```toml
[functions.newsletter-subscribe]
verify_jwt = false
```

- [ ] **Step 3: Deploy + smoke test**

Run: `supabase functions deploy newsletter-subscribe --project-ref wvvdkuextsbsecqbfksb`
Then (replace KEY with the anon key from `.env`):
```bash
curl -s -X POST https://wvvdkuextsbsecqbfksb.supabase.co/functions/v1/newsletter-subscribe \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -H "Origin: https://padel2go-official.de" -d '{"email":"YOUR_GMAIL@gmail.com","source":"test"}'
```
Expected: `{"success":true}` and a confirmation email arrives at YOUR_GMAIL (this is also the external-delivery test). Verify a row exists with `confirmed_at IS NULL`.

- [ ] **Step 4: Commit** — `git add supabase/functions/newsletter-subscribe supabase/config.toml && git commit -m "feat(newsletter): subscribe + double opt-in email"`

---

### Task 4: `newsletter-confirm` edge function

**Files:** Create `supabase/functions/newsletter-confirm/index.ts`; Modify `supabase/config.toml`

- [ ] **Step 1: Write the function** (same CORS/serve skeleton as Task 3)

```ts
// ...imports: serve, createClient; same allowedOrigins + cors() helper...
serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req.headers.get("origin")) });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { token } = await req.json().catch(() => ({}));
    if (!token) return new Response(JSON.stringify({ error: "Token fehlt" }), { status: 400, headers });
    const { data: row } = await admin.from("newsletter_subscribers")
      .select("id, confirmed_at").eq("confirm_token", token).maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: "Ungültiger Link" }), { status: 404, headers });
    if (!row.confirmed_at) {
      await admin.from("newsletter_subscribers").update({ confirmed_at: new Date().toISOString() }).eq("id", row.id);
    }
    return new Response(JSON.stringify({ success: true }), { headers }); // idempotent
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
```

- [ ] **Step 2: config.toml** — `[functions.newsletter-confirm]` / `verify_jwt = false`
- [ ] **Step 3: Deploy + smoke test** — `supabase functions deploy newsletter-confirm --project-ref wvvdkuextsbsecqbfksb`; POST `{token}` (the confirm_token from Task 3's row) → `{"success":true}`; verify `confirmed_at` is now set.
- [ ] **Step 4: Commit** — `git commit -am "feat(newsletter): confirm opt-in"`

---

### Task 5: `newsletter-unsubscribe` edge function

**Files:** Create `supabase/functions/newsletter-unsubscribe/index.ts`; Modify `supabase/config.toml`

- [ ] **Step 1: Write the function** (same skeleton)

```ts
serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req.headers.get("origin")) });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { token } = await req.json().catch(() => ({}));
    if (!token) return new Response(JSON.stringify({ error: "Token fehlt" }), { status: 400, headers });
    const { data: row } = await admin.from("newsletter_subscribers")
      .select("id, unsubscribed_at").eq("unsubscribe_token", token).maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: "Ungültiger Link" }), { status: 404, headers });
    if (!row.unsubscribed_at) {
      await admin.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", row.id);
    }
    return new Response(JSON.stringify({ success: true }), { headers }); // idempotent
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
```

- [ ] **Step 2: config.toml** — `[functions.newsletter-unsubscribe]` / `verify_jwt = false`
- [ ] **Step 3: Deploy + smoke test** — deploy; POST `{token}` (an `unsubscribe_token`) → `{"success":true}`; verify `unsubscribed_at` set; POST again → still `{"success":true}` (idempotent).
- [ ] **Step 4: Commit** — `git commit -am "feat(newsletter): unsubscribe"`

---

### Task 6: `newsletter-send` edge function (test + bulk)

**Files:** Create `supabase/functions/newsletter-send/index.ts`; Modify `supabase/config.toml`

- [ ] **Step 1: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";
import { resolveResendKey, DEFAULT_FROM, REPLY_TO_EMAIL } from "../_shared/email.ts";
import { renderNewsletterHtml } from "../_shared/newsletter.ts";

const APP = "https://www.padel2go-official.de";
const BATCH = 100;
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const SUPERADMIN = "fsteinfelder@padel2go.eu";

serve(async (req) => {
  const H = { ...corsHeaders, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(url, serviceKey);

    // Auth: service-role bearer (self-continue) OR an admin JWT (initial trigger).
    const authHeader = req.headers.get("Authorization") ?? "";
    const isInternal = authHeader === `Bearer ${serviceKey}`;
    if (!isInternal) {
      const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const { data: u } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
      const user = u?.user;
      if (!user) return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: H });
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role && user.email !== SUPERADMIN) return new Response(JSON.stringify({ error: "Keine Admin-Berechtigung" }), { status: 403, headers: H });
    }

    const { campaign_id, test_to, _continue } = await req.json().catch(() => ({}));
    if (!campaign_id) return new Response(JSON.stringify({ error: "campaign_id fehlt" }), { status: 400, headers: H });

    const { data: campaign } = await admin.from("newsletter_campaigns")
      .select("id, subject, preheader, blocks, status").eq("id", campaign_id).maybeSingle();
    if (!campaign) return new Response(JSON.stringify({ error: "Kampagne nicht gefunden" }), { status: 404, headers: H });

    const resendKey = await resolveResendKey(admin);
    if (!resendKey) return new Response(JSON.stringify({ error: "RESEND_API_KEY fehlt" }), { status: 500, headers: H });
    const resend = new Resend(resendKey);

    // TEST MODE — one email, no subscriber writes.
    if (test_to) {
      const html = renderNewsletterHtml(campaign, { unsubscribeUrl: `${APP}/newsletter/abmelden?token=preview` });
      const r = await resend.emails.send({ from: DEFAULT_FROM, to: [test_to], reply_to: REPLY_TO_EMAIL, subject: `[TEST] ${campaign.subject}`, html });
      if (r.error) return new Response(JSON.stringify({ error: r.error.message ?? "Resend-Fehler" }), { status: 502, headers: H });
      return new Response(JSON.stringify({ success: true, test: true, id: r.data?.id }), { headers: H });
    }

    // LAUNCH MODE
    if (!_continue) {
      const { count } = await admin.from("newsletter_subscribers").select("*", { count: "exact", head: true })
        .not("confirmed_at", "is", null).is("unsubscribed_at", null);
      await admin.from("newsletter_campaigns").update({ status: "sending", recipient_count: count ?? 0 }).eq("id", campaign_id);
    }

    const deadline = Date.now() + 100_000; // soft time budget; self-continue past it
    let processedThisRun = 0;
    while (Date.now() < deadline) {
      // Eligible subscribers NOT already logged for this campaign.
      const { data: subs } = await admin.rpc("newsletter_next_batch", { p_campaign_id: campaign_id, p_limit: BATCH });
      if (!subs || subs.length === 0) {
        await admin.from("newsletter_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaign_id);
        return new Response(JSON.stringify({ success: true, done: true, processedThisRun }), { headers: H });
      }
      // Claim (insert 'pending'; UNIQUE prevents a concurrent double-claim).
      const claims = subs.map((s: any) => ({ campaign_id, subscriber_id: s.id, email: s.email, status: "pending" }));
      const { data: claimed } = await admin.from("newsletter_sends").insert(claims).select("id, subscriber_id, email");
      const claimedList = claimed ?? [];
      const byId = new Map(subs.map((s: any) => [s.id, s]));
      // Batch send.
      const messages = claimedList.map((c: any) => {
        const sub = byId.get(c.subscriber_id);
        const unsubscribeUrl = `${APP}/newsletter/abmelden?token=${sub.unsubscribe_token}`;
        return {
          from: DEFAULT_FROM, to: [c.email], reply_to: REPLY_TO_EMAIL, subject: campaign.subject,
          html: renderNewsletterHtml(campaign, { unsubscribeUrl }),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      });
      let ok = 0, failed = 0;
      try {
        const res = await resend.batch.send(messages);
        // Resend batch returns data.data[] in order; treat a top-level error as all-failed for this batch.
        if (res.error) throw new Error(res.error.message ?? "batch error");
        ok = claimedList.length;
        for (const c of claimedList) await admin.from("newsletter_sends").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", c.id);
      } catch (e) {
        failed = claimedList.length;
        for (const c of claimedList) await admin.from("newsletter_sends").update({ status: "failed", error: (e as Error).message }).eq("id", c.id);
      }
      await admin.rpc("newsletter_bump_counters", { p_campaign_id: campaign_id, p_sent: ok, p_failed: failed });
      processedThisRun += claimedList.length;
    }

    // Budget hit with work remaining → fire a self-continue that survives the response.
    const cont = fetch(`${url}/functions/v1/newsletter-send`, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ campaign_id, _continue: true }),
    });
    // @ts-ignore Supabase edge runtime background task
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(cont); else await cont;
    return new Response(JSON.stringify({ success: true, continued: true, processedThisRun }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: H });
  }
});
```

- [ ] **Step 2: Add the two SQL helpers** to `supabase/migrations/20260706130000_newsletter.sql` (append), then re-run those statements in the SQL editor:

```sql
-- Next batch of eligible subscribers not yet logged for this campaign.
CREATE OR REPLACE FUNCTION public.newsletter_next_batch(p_campaign_id uuid, p_limit int)
RETURNS TABLE (id uuid, email text, unsubscribe_token uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.email, s.unsubscribe_token
  FROM public.newsletter_subscribers s
  WHERE s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.newsletter_sends ns WHERE ns.campaign_id = p_campaign_id AND ns.subscriber_id = s.id)
  ORDER BY s.created_at
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.newsletter_bump_counters(p_campaign_id uuid, p_sent int, p_failed int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.newsletter_campaigns
  SET sent_count = sent_count + p_sent, failed_count = failed_count + p_failed
  WHERE id = p_campaign_id;
$$;
```

- [ ] **Step 3: config.toml** — `[functions.newsletter-send]` / `verify_jwt = false`
- [ ] **Step 4: Deploy** — `supabase functions deploy newsletter-send --project-ref wvvdkuextsbsecqbfksb`
- [ ] **Step 5: Verify (test mode)** — after a draft campaign exists (Task 9), calling test mode delivers one `[TEST]` mail. (Deferred smoke test noted in Task 10.)
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(newsletter): batched send engine + test mode"`

---

### Task 7: Public confirm + unsubscribe pages + routes

**Files:** Create `src/pages/NewsletterConfirm.tsx`, `src/pages/NewsletterUnsubscribe.tsx`; Modify `src/App.tsx`

- [ ] **Step 1: NewsletterConfirm.tsx** — reads `?token=`, calls the function once, shows status.

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function NewsletterConfirm() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); return; }
    supabase.functions.invoke("newsletter-confirm", { body: { token } })
      .then(({ data, error }) => setState(!error && (data as any)?.success ? "ok" : "error"))
      .catch(() => setState("error"));
  }, [params]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        {state === "loading" && <p className="text-muted-foreground">Wird bestätigt…</p>}
        {state === "ok" && <><h1 className="text-2xl font-bold text-primary mb-2">Anmeldung bestätigt 🎾</h1><p className="text-muted-foreground">Du erhältst ab jetzt unseren Newsletter.</p></>}
        {state === "error" && <><h1 className="text-2xl font-bold mb-2">Link ungültig</h1><p className="text-muted-foreground">Dieser Bestätigungslink ist ungültig oder abgelaufen.</p></>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: NewsletterUnsubscribe.tsx** — identical shape, calls `newsletter-unsubscribe`, success copy: "Du wurdest abgemeldet. Schade, dass du gehst!"; heading "Abgemeldet".

- [ ] **Step 3: Wire routes in `src/App.tsx`** — add next to the other public routes (near line 133):

```tsx
<Route path="/newsletter/bestaetigen" element={<NewsletterConfirm />} />
<Route path="/newsletter/abmelden" element={<NewsletterUnsubscribe />} />
```
Add the imports at the top with the other page imports:
```tsx
import NewsletterConfirm from "./pages/NewsletterConfirm";
import NewsletterUnsubscribe from "./pages/NewsletterUnsubscribe";
```

- [ ] **Step 4: Verify** — `npm run build` passes. `npm run dev`, open `/newsletter/abmelden?token=<a real unsubscribe_token>` → shows "Abgemeldet"; DB row gets `unsubscribed_at`.
- [ ] **Step 5: Commit** — `git add src/pages/NewsletterConfirm.tsx src/pages/NewsletterUnsubscribe.tsx src/App.tsx && git commit -m "feat(newsletter): public confirm + unsubscribe pages"`

---

### Task 8: Route signup through the edge function (double opt-in)

**Files:** Modify `src/components/events/NewsletterCTA.tsx`

- [ ] **Step 1: Replace the direct insert** (lines ~21-36) with an edge-function call:

```tsx
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", { body: { email, source: "events_page" } });
      if (error) throw error;
      setIsSuccess(true);
      setEmail("");
      toast.success(
        (data as any)?.already
          ? "Du bist bereits angemeldet!"
          : "Fast geschafft! Bitte bestätige die Anmeldung über den Link in deiner E-Mail.",
      );
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Anmeldung fehlgeschlagen. Bitte versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
```

- [ ] **Step 2: Update the success copy** (line ~72) to reflect double opt-in: "Bitte bestätige die Anmeldung über den Link in deiner E-Mail. 📩"
- [ ] **Step 3: Verify** — `npm run build` passes; on the Events page a signup returns the "bitte bestätigen" toast and a confirmation email arrives.
- [ ] **Step 4: Commit** — `git commit -am "feat(newsletter): signup via double-opt-in function"`

---

### Task 9: Admin composer page

**Files:** Create `src/pages/admin/AdminNewsletter.tsx`; Modify `src/components/admin/AdminSidebar.tsx`, `src/App.tsx`

**Pattern references:** copy the card/layout + `useAdminAuth` guard style from `src/pages/admin/AdminIntegrations.tsx`; copy the image-upload pattern from `src/components/admin/courts/LocationForm.tsx` (`supabase.storage.from("media").upload(...)` → `getPublicUrl`).

- [ ] **Step 1: Build `AdminNewsletter.tsx`** with this exact structure and logic:

State:
```tsx
type Block =
  | { type: "heading"; text: string } | { type: "text"; text: string }
  | { type: "image"; url: string; alt?: string } | { type: "button"; label: string; url: string };
const [subject, setSubject] = useState("");
const [preheader, setPreheader] = useState("");
const [blocks, setBlocks] = useState<Block[]>([]);
const [campaignId, setCampaignId] = useState<string | null>(null);
const [sending, setSending] = useState(false);
```

Block ops (pure, keep them small):
```tsx
const addBlock = (b: Block) => setBlocks((p) => [...p, b]);
const updateBlock = (i: number, patch: Partial<Block>) => setBlocks((p) => p.map((b, j) => (j === i ? { ...b, ...patch } as Block : b)));
const removeBlock = (i: number) => setBlocks((p) => p.filter((_, j) => j !== i));
const moveBlock = (i: number, dir: -1 | 1) => setBlocks((p) => {
  const j = i + dir; if (j < 0 || j >= p.length) return p; const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
});
```

Image upload (mirror LocationForm):
```tsx
const uploadImage = async (file: File): Promise<string> => {
  const path = `newsletter/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
};
```

Save draft:
```tsx
const saveDraft = async () => {
  const payload = { subject, preheader, blocks };
  if (campaignId) { await (supabase.from("newsletter_campaigns") as any).update(payload).eq("id", campaignId); }
  else { const { data } = await (supabase.from("newsletter_campaigns") as any).insert(payload).select("id").single(); setCampaignId(data.id); }
  toast.success("Entwurf gespeichert");
};
```

Test send (saves first to guarantee a campaign id):
```tsx
const sendTest = async () => {
  await saveDraft();
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.functions.invoke("newsletter-send", { body: { campaign_id: campaignId, test_to: u.user?.email } });
  toast[error ? "error" : "success"](error ? "Test fehlgeschlagen" : "Test-Mail verschickt");
};
```

Launch (confirm dialog → invoke):
```tsx
const launch = async () => {
  await saveDraft();
  if (!confirm("Newsletter jetzt an ALLE bestätigten Abonnenten senden?")) return;
  setSending(true);
  const { error } = await supabase.functions.invoke("newsletter-send", { body: { campaign_id: campaignId } });
  setSending(false);
  toast[error ? "error" : "success"](error ? "Versand fehlgeschlagen" : "Versand gestartet");
};
```

Live preview: render the blocks to the same HTML the backend produces and show it in a sandboxed iframe:
```tsx
// Mirror _shared/newsletter.ts renderBlock inline (heading=lime h2, text=<p>, image=<img>, button=lime pill),
// wrapped in the black/lime card, and set as <iframe srcDoc={previewHtml} className="w-full h-[600px] rounded-xl border border-border" title="Vorschau" />
```

Layout: two columns on `lg:` — left = composer (subject input, preheader input, block list with per-block editor + up/down/delete, "+ Überschrift / + Text / + Bild / + Button" buttons); right = live preview iframe. Below: subscriber counts (query `newsletter_subscribers`), action buttons (Entwurf speichern / Test an mich / An alle senden), and a campaign-history list (query `newsletter_campaigns` ordered by created_at desc, show subject/status/sent_count/recipient_count/sent_at). Guard the page with the same admin-auth wrapper the other admin pages use.

- [ ] **Step 2: Sidebar** — in `src/components/admin/AdminSidebar.tsx` add to the items array (after "Mitteilungen"): `{ title: "Newsletter", url: "/admin/newsletter", icon: Send }` and import `Send` from `lucide-react`.
- [ ] **Step 3: Route** — in `src/App.tsx` add the admin route alongside the other `/admin/*` routes: `<Route path="/admin/newsletter" element={<AdminNewsletter />} />` + import.
- [ ] **Step 4: Verify** — `npm run build` and `npm run lint` pass. `npm run dev` → `/admin/newsletter` renders; add blocks → preview updates; "Entwurf speichern" creates a `newsletter_campaigns` row.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(newsletter): admin composer page"`

---

### Task 10: Deploy, migrate, end-to-end verify

- [ ] **Step 1: Run migration** — paste all of `20260706130000_newsletter.sql` (incl. the two functions from Task 6 Step 2) into the Supabase SQL editor; run.
- [ ] **Step 2: Deploy functions** — `supabase functions deploy --project-ref wvvdkuextsbsecqbfksb` (or the 4 newsletter-* by name).
- [ ] **Step 3: Push frontend** — commit remaining changes; push `main` (Vercel deploys). Push to both remotes `origin` + `padel2go` per CLAUDE.md.
- [ ] **Step 4: E2E test**
  1. On the live Events page, subscribe with your Gmail → confirmation email arrives (external delivery proof).
  2. Click confirm link → `confirmed_at` set.
  3. In `/admin/newsletter`, compose a draft, "Test an mich" → `[TEST]` mail arrives.
  4. "An alle senden" → your Gmail receives the newsletter; `newsletter_sends` has a `sent` row; campaign `status='sent'`.
  5. Click "Abmelden" in the footer → `unsubscribed_at` set; a re-send excludes you.
- [ ] **Step 5: Final commit** — `git commit -am "chore(newsletter): rollout notes"` (if any).

---

## Self-Review (author checklist — completed)

- **Spec coverage:** double opt-in (T1,T3,T4,T8), unsubscribe + List-Unsubscribe (T1,T5,T6,T7), block composer + preview (T9), renderer (T2), batched idempotent send + test mode (T6), campaign history (T9), subscriber routing (T8), RLS/admin (T1,T6,T9). ✅
- **Placeholders:** none — full code for all backend; admin UI gives exact state/handlers + pattern references for boilerplate JSX.
- **Type consistency:** `Block` shape identical in `_shared/newsletter.ts` (T2) and `AdminNewsletter.tsx` (T9); `renderNewsletterHtml(campaign,{unsubscribeUrl})` signature matches its caller in T6; column names match T1 everywhere; `newsletter_next_batch`/`newsletter_bump_counters` defined in T6 Step 2 and called in T6 Step 1.
