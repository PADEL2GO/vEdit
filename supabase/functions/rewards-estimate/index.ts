import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimateRequest {
  booking_id?: string;
  price_cents?: number;
  start_time?: string;
  end_time?: string;
  court_id?: string;
}

interface RewardBreakdown {
  key: string;
  title: string;
  points: number;
  description?: string;
}

interface EstimateResponse {
  total_points: number;
  breakdown: RewardBreakdown[];
  disclaimers: string[];
  multiplier?: number;
  level_name?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[payback-estimate] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (!user) throw new Error("User not authenticated");

    const requestData: EstimateRequest = await req.json();
    logStep("Processing estimate", { userId: user.id, booking_id: requestData.booking_id });

    // ── Determine booking duration in hours ──────────────────────────────
    let startTime = requestData.start_time;
    let endTime = requestData.end_time;
    let courtId = requestData.court_id;
    if (requestData.booking_id) {
      const { data: bk } = await supabaseAdmin
        .from("bookings")
        .select("court_id, start_time, end_time")
        .eq("id", requestData.booking_id)
        .maybeSingle();
      if (bk) {
        courtId = courtId ?? (bk as any).court_id;
        if (!startTime || !endTime) { startTime = (bk as any).start_time; endTime = (bk as any).end_time; }
      }
    }
    let durationMin = 60;
    if (startTime && endTime) {
      durationMin = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    }
    const durationBucket = durationMin >= 120 ? 120 : durationMin >= 90 ? 90 : 60;

    // ── Admin-configurable fixed payback per booking length (60 / 90 / 120 min) ──
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("payback_points_60min, payback_points_90min, payback_points_120min")
      .eq("id", "global")
      .maybeSingle();
    const rate60 = Number((settings as any)?.payback_points_60min ?? 100) || 0;
    const rate90 = Number((settings as any)?.payback_points_90min ?? 150) || 0;
    const rate120 = Number((settings as any)?.payback_points_120min ?? 200) || 0;
    const base = durationMin >= 120 ? rate120 : durationMin >= 90 ? rate90 : rate60;

    // ── Time-window band factor, resolved for the booking START time ──────
    // Same resolution as the payback credit in stripe-webhook, so the preview
    // can never differ from what is credited after payment.
    let bandMultiplier = 1;
    let pointsBandName: string | null = null;
    if (courtId && startTime) {
      try {
        const { data: rateRows, error: rateError } = await supabaseAdmin.rpc("resolve_booking_rate", {
          p_court_id: courtId,
          p_start: startTime,
          p_duration_minutes: durationBucket,
        });
        if (rateError) {
          logStep("Band lookup failed — continuing with x1.0", { error: rateError.message });
        } else {
          const rate = Array.isArray(rateRows) ? (rateRows as any[])[0] : (rateRows as any);
          const rawMult = Number(rate?.points_multiplier);
          if (Number.isFinite(rawMult) && rawMult >= 0) bandMultiplier = rawMult;
          pointsBandName = (rate?.points_band_name as string | null) ?? null;
        }
      } catch (rateErr) {
        logStep("Band lookup failed — continuing with x1.0", { error: (rateErr as Error).message });
      }
    }

    // ── Expert-level multiplier (based on user's lifetime credits) ────────
    const { data: multData } = await supabaseAdmin.rpc("get_user_level_multiplier", {
      p_user_id: user.id,
    });
    const multiplier = Number(multData ?? 1) || 1;

    // Current level name (for display)
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("lifetime_credits")
      .eq("user_id", user.id)
      .maybeSingle();
    const lifetime = Number((wallet as any)?.lifetime_credits ?? 0);
    const { data: lvl } = await supabaseAdmin
      .from("expert_levels_config")
      .select("name")
      .lte("min_points", lifetime)
      .or(`max_points.is.null,max_points.gte.${lifetime}`)
      .order("min_points", { ascending: false })
      .limit(1)
      .maybeSingle();
    const levelName = (lvl as any)?.name as string | undefined;

    const total_points = Math.round(base * bandMultiplier * multiplier);

    // Deltas are derived from the running subtotal so the rows always add up to total_points.
    const withBand = Math.round(base * bandMultiplier);
    const bandDelta = withBand - base;
    const levelDelta = total_points - withBand;

    const breakdown: RewardBreakdown[] = [
      {
        key: "BOOKING_PAYBACK",
        title: "Buchungs-Payback",
        points: base,
        description: `${durationBucket} Min Buchung`,
      },
    ];
    if (bandDelta !== 0) {
      breakdown.push({
        key: "TIME_BAND",
        title: `Zeitfenster-Bonus ×${bandMultiplier}${pointsBandName ? ` (${pointsBandName})` : ""}`,
        points: bandDelta,
        description: "Bonus für dieses Zeitfenster",
      });
    }
    if (multiplier !== 1 && levelDelta !== 0) {
      breakdown.push({
        key: "LEVEL_MULTIPLIER",
        title: `Level-Bonus ×${multiplier}${levelName ? ` (${levelName})` : ""}`,
        points: levelDelta,
        description: "Dein Expert-Level-Multiplikator",
      });
    }

    const disclaimers: string[] = [];
    if (total_points > 0) {
      disclaimers.push("Punkte werden nach Zahlung automatisch gutgeschrieben.");
    }

    const response: EstimateResponse = {
      total_points,
      breakdown,
      disclaimers,
      multiplier,
      level_name: levelName,
    };
    logStep("Estimate complete", { total_points, base, bandMultiplier, pointsBandName, multiplier, levelName });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
