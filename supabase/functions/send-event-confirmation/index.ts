import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

// Sends a branded "Anmeldung bestätigt" email (with ticket code) after a user
// registers for an event in-app. Called by the frontend right after register_for_event.

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

    const { registration_id } = await req.json().catch(() => ({}));
    if (!registration_id) return json({ error: "registration_id fehlt" }, 400);

    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("id, ticket_code, user_id, event:events(title, start_at, venue_name, city)")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg || reg.user_id !== user.id) return json({ error: "Anmeldung nicht gefunden" }, 404);
    if (!user.email) return json({ error: "Keine E-Mail hinterlegt" }, 400);

    const resendKey = await resolveResendKey(supabaseAdmin);
    if (!resendKey) return json({ success: true, skipped: "resend_not_configured" }, 200);

    const ev = (Array.isArray(reg.event) ? reg.event[0] : reg.event) as
      | { title: string; start_at: string | null; venue_name: string | null; city: string | null }
      | null;
    const start = ev?.start_at ? new Date(ev.start_at) : null;

    const rows = [{ label: "Event", value: ev?.title ?? "-" }];
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
    rows.push({ label: "Ort", value: ev?.venue_name || ev?.city || "-" });

    const html = brandedEmailHtml({
      title: "Anmeldung bestätigt",
      emoji: "🎫",
      heading: "Du bist dabei! 🎾",
      intro: "Deine Anmeldung zum Event ist bestätigt.",
      rows,
      highlight: { label: "Dein Ticket-Code", value: reg.ticket_code },
      ctaLabel: "Zu meinen Events",
      ctaUrl: "https://www.padel2go-official.de/dashboard/events",
      note: "Zeig deinen Ticket-Code am Einlass. Bis dann!",
    });

    await sendBrandedEmail(resendKey, user.email, `Anmeldung bestätigt: ${ev?.title ?? "Event"}`, html);
    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
