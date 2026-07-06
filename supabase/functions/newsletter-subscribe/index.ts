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
