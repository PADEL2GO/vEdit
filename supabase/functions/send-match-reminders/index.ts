import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) =>
  console.log(`[send-match-reminders] ${step}`, details ? JSON.stringify(details) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Cron-only: require the service-role key.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const nowIso = new Date().toISOString();
    const inOneHourIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Confirmed bookings starting within the next hour that haven't been reminded yet.
    const { data: due, error: fetchError } = await supabase
      .from("bookings")
      .select("id, user_id, guest_email, guest_name, start_time, courts!inner(name), locations!inner(name)")
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
      .gt("start_time", nowIso)
      .lte("start_time", inOneHourIso);

    if (fetchError) throw new Error(`Failed to fetch bookings: ${fetchError.message}`);

    const resendKey = await resolveResendKey(supabase);
    let sent = 0;
    let errors = 0;

    for (const b of due ?? []) {
      // Atomically claim the reminder so a concurrent/overlapping run can't double-notify.
      const { data: claimed } = await supabase
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", b.id)
        .is("reminder_sent_at", null)
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const court = (Array.isArray(b.courts) ? b.courts[0] : b.courts) as { name: string };
      const location = (Array.isArray(b.locations) ? b.locations[0] : b.locations) as { name: string };

      // In-app notification (authenticated users only).
      if (b.user_id) {
        const { error } = await supabase.from("notifications").insert({
          user_id: b.user_id,
          type: "match_reminder",
          title: "Dein Match startet bald! 🎾",
          message: `In etwa einer Stunde: ${court.name} @ ${location.name}. Viel Spaß beim Spiel!`,
          cta_url: "/dashboard/booking",
          entity_type: "booking",
          entity_id: b.id,
        });
        if (error) logStep("Failed to insert reminder notification", { bookingId: b.id, error: error.message });
      }

      // Branded reminder email — guest email if present, otherwise the account email.
      try {
        let email = ((b as { guest_email?: string | null }).guest_email) || null;
        if (!email && b.user_id) {
          const { data: u } = await supabase.auth.admin.getUserById(b.user_id);
          email = u.user?.email ?? null;
        }
        if (resendKey && email) {
          const start = new Date(b.start_time as string);
          const timeFormatted = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
          const dateFormatted = start.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
          const html = brandedEmailHtml({
            title: "Erinnerung: dein Court startet bald",
            emoji: "⏰",
            heading: "Dein Match startet bald!",
            intro: "In etwa einer Stunde geht's los — viel Spaß auf dem Court!",
            rows: [
              { label: "Standort", value: location.name },
              { label: "Court", value: court.name },
              { label: "Wann", value: `${dateFormatted}, ${timeFormatted} Uhr` },
            ],
            note: "Bis gleich auf dem Court! 🎾",
          });
          await sendBrandedEmail(resendKey, email, "Erinnerung: dein Court startet bald 🎾", html);
        }
        sent++;
      } catch (mailErr) {
        errors++;
        logStep("Failed to send reminder email", { bookingId: b.id, error: (mailErr as Error).message });
      }
    }

    logStep("Reminders processed", { candidates: (due ?? []).length, sent, errors });

    // Non-2xx on partial failure so an external monitor can alert.
    return new Response(
      JSON.stringify({ sent, errors, candidates: (due ?? []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: errors > 0 ? 500 : 200 },
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
