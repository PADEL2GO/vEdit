import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptInSettings {
  user_id: string;
  is_active: boolean;
  preferred_location_ids: string[];
  skill_range_min: number;
  skill_range_max: number;
  availability_json: Record<string, string[]>;
}

interface SkillStats {
  user_id: string;
  skill_level: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authorized (cron jobs pass the service role key)
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[matching-algorithm] Starting weekly matching run...");

    // 1. Get all active opt-in users
    const { data: activeUsers, error: usersError } = await supabase
      .from("match_opt_in_settings")
      .select("*")
      .eq("is_active", true);

    if (usersError) throw usersError;

    if (!activeUsers || activeUsers.length < 2) {
      console.log("[matching-algorithm] Not enough active users for matching");
      return new Response(
        JSON.stringify({ success: true, message: "Not enough users", matched: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[matching-algorithm] Found ${activeUsers.length} active users`);

    // 2. Get skill stats for all active users
    const userIds = activeUsers.map((u) => u.user_id);
    const { data: skillStats } = await supabase
      .from("skill_stats")
      .select("user_id, skill_level")
      .in("user_id", userIds);

    const skillMap = new Map<string, number>(
      skillStats?.map((s) => [s.user_id, s.skill_level || 5]) || []
    );

    // 3. Get existing friendships to avoid suggesting existing friends
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .in("status", ["accepted", "pending"])
      .or(`requester_id.in.(${userIds.join(",")}),addressee_id.in.(${userIds.join(",")})`);

    const friendPairs = new Set<string>();
    friendships?.forEach((f) => {
      friendPairs.add(`${f.requester_id}-${f.addressee_id}`);
      friendPairs.add(`${f.addressee_id}-${f.requester_id}`);
    });

    // 4. Get existing suggestions from this week to avoid duplicates
    const today = new Date().toISOString().split("T")[0];
    const { data: existingSuggestions } = await supabase
      .from("match_suggestions")
      .select("user_id, matched_user_id")
      .eq("suggested_date", today);

    const existingPairs = new Set<string>(
      existingSuggestions?.map((s) => `${s.user_id}-${s.matched_user_id}`) || []
    );

    // 5. Calculate matches for each user
    const newSuggestions: Array<{
      user_id: string;
      matched_user_id: string;
      location_id: string | null;
      score: number;
      match_reason: string;
    }> = [];

    for (const userA of activeUsers) {
      const userASkill = skillMap.get(userA.user_id) || 5;

      for (const userB of activeUsers) {
        if (userA.user_id === userB.user_id) continue;

        // Skip if already friends or pending
        if (friendPairs.has(`${userA.user_id}-${userB.user_id}`)) continue;

        // Skip if already suggested today
        if (existingPairs.has(`${userA.user_id}-${userB.user_id}`)) continue;

        const userBSkill = skillMap.get(userB.user_id) || 5;

        // Hard constraints
        // 1. Skill range check
        const skillMatch =
          userBSkill >= userA.skill_range_min &&
          userBSkill <= userA.skill_range_max &&
          userASkill >= userB.skill_range_min &&
          userASkill <= userB.skill_range_max;

        if (!skillMatch) continue;

        // 2. Location overlap check
        const locationOverlap = userA.preferred_location_ids.filter((id: string) =>
          userB.preferred_location_ids.includes(id)
        );

        if (locationOverlap.length === 0) continue;

        // 3. Availability overlap check
        const availabilityA = userA.availability_json as Record<string, string[]>;
        const availabilityB = userB.availability_json as Record<string, string[]>;
        let hasTimeOverlap = false;
        const overlappingDays: string[] = [];

        for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
          const slotsA = availabilityA[day] || [];
          const slotsB = availabilityB[day] || [];
          const overlap = slotsA.filter((slot) => slotsB.includes(slot));
          if (overlap.length > 0) {
            hasTimeOverlap = true;
            overlappingDays.push(day);
          }
        }

        if (!hasTimeOverlap) continue;

        // Soft scoring
        let score = 50; // Base score

        // Closer skill level = higher score
        const skillDiff = Math.abs(userASkill - userBSkill);
        score += Math.max(0, 30 - skillDiff * 5);

        // More location overlap = higher score
        score += locationOverlap.length * 10;

        // More availability overlap = higher score
        score += overlappingDays.length * 5;

        // Generate match reason
        const reasons: string[] = [];
        if (skillDiff <= 1) reasons.push("Ähnliches Skill-Level");
        if (locationOverlap.length > 1) reasons.push("Mehrere gemeinsame Standorte");
        if (overlappingDays.length >= 3) reasons.push("Flexible Zeiten");

        newSuggestions.push({
          user_id: userA.user_id,
          matched_user_id: userB.user_id,
          location_id: locationOverlap[0] || null,
          score,
          match_reason: reasons.length > 0 ? reasons[0] : "Gute Übereinstimmung",
        });
      }
    }

    console.log(`[matching-algorithm] Generated ${newSuggestions.length} potential matches`);

    // 6. Insert top suggestions (limit per user)
    const suggestionsPerUser = new Map<string, number>();
    const maxSuggestionsPerUser = 3;
    const filteredSuggestions = newSuggestions
      .sort((a, b) => b.score - a.score)
      .filter((s) => {
        const count = suggestionsPerUser.get(s.user_id) || 0;
        if (count >= maxSuggestionsPerUser) return false;
        suggestionsPerUser.set(s.user_id, count + 1);
        return true;
      });

    if (filteredSuggestions.length > 0) {
      const { error: insertError } = await supabase
        .from("match_suggestions")
        .insert(filteredSuggestions);

      if (insertError) {
        console.error("[matching-algorithm] Insert error:", insertError);
        throw insertError;
      }
    }

    console.log(`[matching-algorithm] Inserted ${filteredSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Matching complete",
        matched: filteredSuggestions.length,
        totalUsers: activeUsers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[matching-algorithm] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
