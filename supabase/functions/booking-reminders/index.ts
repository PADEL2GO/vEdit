import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authorized (cron jobs pass the service role key)
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseServiceKey
    );

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    let notificationsSent = 0;

    // 24-hour reminders
    const { data: bookings24h } = await supabase
      .from("bookings")
      .select(`
        id, user_id, start_time,
        location:locations(name),
        court:courts(name)
      `)
      .eq("status", "confirmed")
      .is("reminder_sent_24h", null)
      .gte("start_time", in24Hours.toISOString())
      .lt("start_time", in25Hours.toISOString());

    for (const booking of bookings24h || []) {
      const startTime = new Date(booking.start_time);
      const timeStr = startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const dateStr = startTime.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "booking_reminder",
        title: "Morgen: Deine Buchung",
        message: `${dateStr} um ${timeStr} Uhr in ${(booking.location as any)?.name || ""}`,
        cta_url: "/dashboard/booking",
        entity_type: "booking",
        entity_id: booking.id,
      });

      // Mark as sent
      await supabase
        .from("bookings")
        .update({ reminder_sent_24h: now.toISOString() })
        .eq("id", booking.id);

      notificationsSent++;
    }

    // 1-hour reminders
    const { data: bookings1h } = await supabase
      .from("bookings")
      .select(`
        id, user_id, start_time,
        location:locations(name),
        court:courts(name)
      `)
      .eq("status", "confirmed")
      .is("reminder_sent_1h", null)
      .gte("start_time", in1Hour.toISOString())
      .lt("start_time", in2Hours.toISOString());

    for (const booking of bookings1h || []) {
      const startTime = new Date(booking.start_time);
      const timeStr = startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "booking_reminder",
        title: "In 1 Stunde: Dein Match",
        message: `Um ${timeStr} Uhr in ${(booking.location as any)?.name || ""}`,
        cta_url: "/dashboard/booking",
        entity_type: "booking",
        entity_id: booking.id,
      });

      // Mark as sent
      await supabase
        .from("bookings")
        .update({ reminder_sent_1h: now.toISOString() })
        .eq("id", booking.id);

      notificationsSent++;
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: notificationsSent }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Booking reminder error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
