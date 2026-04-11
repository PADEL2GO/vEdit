import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[process-completed-bookings] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Verify the caller is authorized (cron jobs pass the service role key)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Starting completed bookings processing");

    // Find confirmed bookings that ended in the last 48 hours.
    // The 48-hour window prevents re-processing old bookings on every cron run.
    // Rewards-trigger for these bookings only activates PENDING reward instances,
    // so if already processed the call is effectively a no-op — but the window
    // keeps the query fast and avoids redundant work on historical data.
    const now = new Date();
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const { data: completedBookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, price_cents, start_time, end_time")
      .eq("status", "confirmed")
      .lt("end_time", now.toISOString())
      .gte("end_time", windowStart.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
    }

    if (!completedBookings || completedBookings.length === 0) {
      logStep("No completed bookings to process");
      return new Response(
        JSON.stringify({ processed: 0, message: "No bookings to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found bookings to complete", { count: completedBookings.length });

    let processedCount = 0;
    let errorCount = 0;

    for (const booking of completedBookings) {
      try {
        // Only trigger rewards for bookings that still have PENDING reward instances.
        // Once all instances are AVAILABLE/CLAIMED this is a no-op, preventing double-awarding.
        const { data: pendingRewards } = await supabaseAdmin
          .from("reward_instances")
          .select("id")
          .eq("source_type", "booking")
          .eq("source_id", booking.id)
          .eq("status", "PENDING")
          .limit(1);

        if (!pendingRewards || pendingRewards.length === 0) {
          logStep("No pending rewards for booking — skipping", { bookingId: booking.id });
          processedCount++;
          continue;
        }

        // Trigger bookingCompleted event for rewards
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event: "bookingCompleted",
              userId: booking.user_id,
              bookingId: booking.id,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            logStep("Rewards trigger failed", { bookingId: booking.id, status: response.status, error: errorText });
          } else {
            logStep("Rewards activated for booking", { bookingId: booking.id });
          }
        } catch (rewardErr) {
          logStep("Failed to call rewards-trigger", { bookingId: booking.id, error: (rewardErr as Error).message });
        }

        processedCount++;
      } catch (err) {
        logStep("Error processing booking", { bookingId: booking.id, error: (err as Error).message });
        errorCount++;
      }
    }

    logStep("Processing complete", { processedCount, errorCount });

    return new Response(
      JSON.stringify({ 
        processed: processedCount, 
        errors: errorCount,
        message: `Processed ${processedCount} bookings, ${errorCount} errors` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
