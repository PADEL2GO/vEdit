import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

// Sends a branded "Anmeldung storniert" email after a user cancels their in-app event
// registration. Called fire-and-forget by the frontend after cancel_event_registration.
// The event still exists post-cancel (only the registration row is removed), so we look it
// up by event_id; the caller can only ever email their own account address.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nicht autorisiert" }, 401);
    const { data: userData } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return json({ error: "Nicht autorisiert" }, 401);
    if (!user.email) return json({ error: "Keine E-Mail hinterlegt" }, 400);

    const { event_id } = await req.json().catch(() => ({}));
    if (!event_id) return json({ error: "event_id fehlt" }, 400);

    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("title, start_at, venue_name, city")
      .eq("id", event_id)
      .maybeSingle();
    if (!ev) return json({ error: "Event nicht gefunden" }, 404);

    const resendKey = await resolveResendKey(supabaseAdmin);
    if (!resendKey) return json({ success: true, skipped: "resend_not_configured" }, 200);

    const start = ev.start_at ? new Date(ev.start_at) : null;
    const rows = [{ label: "Event", value: ev.title ?? "-" }];
    if (start) {
      rows.push({
        label: "Wann",
        value:
          start.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) +
          ", " +
          start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
          " Uhr",
      });
    }
    rows.push({ label: "Ort", value: ev.venue_name || ev.city || "-" });

    const html = brandedEmailHtml({
      title: "Anmeldung storniert",
      emoji: "🚫",
      heading: "Anmeldung storniert",
      intro: "Deine Anmeldung zu diesem Event wurde storniert.",
      rows,
      note: "Schade, dass es nicht klappt — du kannst dich jederzeit wieder anmelden.",
      ctaLabel: "Weitere Events",
      ctaUrl: "https://www.padel2go-official.de/dashboard/events",
    });

    await sendBrandedEmail(resendKey, user.email, `Anmeldung storniert: ${ev.title ?? "Event"}`, html);
    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
