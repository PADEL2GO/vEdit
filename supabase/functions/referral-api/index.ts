import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[referral-api] ${step}`, details ? JSON.stringify(details) : "");
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
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    logStep("Request", { path, method: req.method });

    if (path === "link" && req.method === "GET") {
      // GET /referral-api/link - Get user's referral link
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      // Get or create referral code
      let { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .single();

      if (!profile?.referral_code) {
        // Generate referral code
        const code = await generateUniqueCode();
        await supabaseAdmin
          .from("profiles")
          .update({ referral_code: code })
          .eq("user_id", user.id);
        profile = { referral_code: code };
      }

      const origin = req.headers.get("origin") || "https://www.padel2go-official.de";
      const referralLink = `${origin}/auth?ref=${profile.referral_code}`;

      // Get referral stats
      const { count: totalReferrals } = await supabaseAdmin
        .from("referral_attributions")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", user.id);

      const { count: completedReferrals } = await supabaseAdmin
        .from("referral_attributions")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", user.id)
        .not("first_booking_at", "is", null);

      return new Response(JSON.stringify({
        referralCode: profile.referral_code,
        referralLink,
        stats: {
          totalReferrals: totalReferrals || 0,
          completedReferrals: completedReferrals || 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (path === "attribution" && req.method === "POST") {
      // POST /referral-api/attribution - Process referral attribution on signup
      const { referralCode, referredUserId } = await req.json();

      if (!referralCode || !referredUserId) {
        throw new Error("referralCode and referredUserId required");
      }

      logStep("Processing attribution", { referralCode, referredUserId });

      // Find referrer by code
      const { data: referrerProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("referral_code", referralCode.toUpperCase())
        .single();

      if (!referrerProfile) {
        logStep("Referrer not found", { referralCode });
        return new Response(JSON.stringify({ success: false, error: "Invalid referral code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Don't allow self-referral
      if (referrerProfile.user_id === referredUserId) {
        logStep("Self-referral blocked", { referralCode });
        return new Response(JSON.stringify({ success: false, error: "Cannot refer yourself" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Check if attribution already exists
      const { data: existing } = await supabaseAdmin
        .from("referral_attributions")
        .select("id")
        .eq("referred_user_id", referredUserId)
        .single();

      if (existing) {
        logStep("Attribution already exists", { referredUserId });
        return new Response(JSON.stringify({ success: true, alreadyExists: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Create attribution
      const { error: insertError } = await supabaseAdmin
        .from("referral_attributions")
        .insert({
          referrer_user_id: referrerProfile.user_id,
          referred_user_id: referredUserId,
          referral_code: referralCode.toUpperCase(),
        });

      if (insertError) {
        logStep("Failed to create attribution", { error: insertError.message });
        throw new Error("Failed to create attribution");
      }

      // Trigger referral signup reward for referrer
      const triggerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/rewards-trigger`;
      await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event: "referralSignup",
          userId: referrerProfile.user_id,
          referredUserId,
        }),
      });

      logStep("Attribution created", { referrerId: referrerProfile.user_id, referredUserId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: message === "Unauthorized" ? 401 : 500,
    });
  }
});

function generateUniqueCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
