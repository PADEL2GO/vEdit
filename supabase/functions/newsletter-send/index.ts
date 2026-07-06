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
