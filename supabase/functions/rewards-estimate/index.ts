import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimateRequest {
  booking_id?: string;
  price_cents: number;
  start_time: string;
  days_in_advance?: number;
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
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[rewards-estimate] ${step}`, details ? JSON.stringify(details) : "");
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
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const requestData: EstimateRequest = await req.json();
    const { price_cents, start_time, days_in_advance } = requestData;
    
    logStep("Processing estimate", { userId: user.id, price_cents, start_time });

    const breakdown: RewardBreakdown[] = [];
    const disclaimers: string[] = [];

    // Fetch active reward definitions
    const { data: definitions } = await supabaseAdmin
      .from("reward_definitions")
      .select("*")
      .eq("is_active", true)
      .in("key", ["BOOKING_PAID", "FIRST_BOOKING_BONUS", "OFFPEAK_BONUS", "EARLY_BIRD"]);

    const defMap = new Map(definitions?.map(d => [d.key, d]) || []);

    // 1. BOOKING_PAID - percentage of price (10%)
    const bookingDef = defMap.get("BOOKING_PAID");
    if (bookingDef && price_cents > 0) {
      const pointsRule = bookingDef.points_rule as { type: string; value: number; divisor?: number };
      const divisor = pointsRule.divisor || 100;
      const points = Math.floor((price_cents * pointsRule.value) / divisor / 100);
      if (points > 0) {
        breakdown.push({
          key: "BOOKING_PAID",
          title: "Buchungs-Bonus",
          points,
          description: `10% vom Buchungspreis`,
        });
      }
    }

    // 2. FIRST_BOOKING_BONUS - check if first booking
    const { count: existingBookings } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    if ((existingBookings || 0) === 0) {
      const firstDef = defMap.get("FIRST_BOOKING_BONUS");
      if (firstDef) {
        const pointsRule = firstDef.points_rule as { value: number };
        breakdown.push({
          key: "FIRST_BOOKING_BONUS",
          title: "Erste Buchung",
          points: pointsRule.value,
          description: "Bonus für deine erste Buchung!",
        });
      }
    }

    // 3. OFFPEAK_BONUS - before 10am or after 8pm
    if (start_time) {
      const startDate = new Date(start_time);
      const hour = startDate.getHours();
      if (hour < 10 || hour >= 20) {
        const offpeakDef = defMap.get("OFFPEAK_BONUS");
        if (offpeakDef) {
          const pointsRule = offpeakDef.points_rule as { value: number };
          breakdown.push({
            key: "OFFPEAK_BONUS",
            title: "Off-Peak Bonus",
            points: pointsRule.value,
            description: "Randzeit-Buchung",
          });
        }
      }
    }

    // 4. EARLY_BIRD - 7+ days in advance
    const effectiveDaysInAdvance = days_in_advance !== undefined 
      ? days_in_advance 
      : (start_time ? (new Date(start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 0);

    if (effectiveDaysInAdvance >= 7) {
      const earlyDef = defMap.get("EARLY_BIRD");
      if (earlyDef) {
        const pointsRule = earlyDef.points_rule as { value: number };
        breakdown.push({
          key: "EARLY_BIRD",
          title: "Early Bird",
          points: pointsRule.value,
          description: "7+ Tage im Voraus gebucht",
        });
      }
    }

    // Calculate total
    const total_points = breakdown.reduce((sum, b) => sum + b.points, 0);

    // Add disclaimers if applicable
    if (total_points > 0) {
      disclaimers.push("Credits werden nach Zahlung automatisch gutgeschrieben.");
    }

    const response: EstimateResponse = {
      total_points,
      breakdown,
      disclaimers,
    };

    logStep("Estimate complete", { total_points, breakdownCount: breakdown.length });

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
