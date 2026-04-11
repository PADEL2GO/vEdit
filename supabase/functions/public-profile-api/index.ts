import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expert levels config (matching src/lib/expertLevels.ts)
const EXPERT_LEVELS = [
  { name: "Beginner", minPoints: 0, maxPoints: 2999, gradient: "from-zinc-400 to-zinc-500", emoji: "🌱" },
  { name: "Rookie", minPoints: 3000, maxPoints: 5999, gradient: "from-amber-500 to-orange-500", emoji: "🎾" },
  { name: "Player", minPoints: 6000, maxPoints: 9999, gradient: "from-blue-400 to-cyan-500", emoji: "⚡" },
  { name: "Expert", minPoints: 10000, maxPoints: 14999, gradient: "from-lime-400 to-green-500", emoji: "🔥" },
  { name: "Pro", minPoints: 15000, maxPoints: 24999, gradient: "from-orange-500 to-red-500", emoji: "💎" },
  { name: "Master", minPoints: 25000, maxPoints: 49999, gradient: "from-purple-500 to-pink-500", emoji: "👑" },
  { name: "Champion", minPoints: 50000, maxPoints: 79999, gradient: "from-cyan-400 to-violet-500", emoji: "🏆" },
  { name: "Padel Legend", minPoints: 80000, maxPoints: Infinity, gradient: "from-yellow-400 to-lime-400", emoji: "🌟" },
];

function getExpertLevel(playCredits: number) {
  for (let i = EXPERT_LEVELS.length - 1; i >= 0; i--) {
    if (playCredits >= EXPERT_LEVELS[i].minPoints) {
      return EXPERT_LEVELS[i];
    }
  }
  return EXPERT_LEVELS[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client for auth check
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get("Authorization");
    
    // Verify user is authenticated
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, username, userId } = body;

    if (action === "profile" && username) {
      console.log(`[public-profile-api] Fetching profile for username: ${username}`);

      // Get profile by username
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, created_at, games_played_self")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        console.error("[public-profile-api] Profile not found:", profileError);
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get wallet data
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("play_credits, lifetime_credits")
        .eq("user_id", profile.user_id)
        .single();

      // Get skill stats
      const { data: skillStats } = await supabaseAdmin
        .from("skill_stats")
        .select("skill_level")
        .eq("user_id", profile.user_id)
        .single();

      // Get match history (last 10 matches)
      const { data: matches } = await supabaseAdmin
        .from("match_analyses")
        .select("result, credits_awarded, analyzed_at")
        .eq("user_id", profile.user_id)
        .eq("status", "analyzed")
        .order("analyzed_at", { ascending: false })
        .limit(10);

      // Calculate W/L stats
      const wins = matches?.filter(m => m.result === "W").length || 0;
      const losses = matches?.filter(m => m.result === "L").length || 0;
      const draws = matches?.filter(m => m.result === "D").length || 0;
      const last5 = matches?.slice(0, 5).map(m => m.result) || [];

      const playCredits = wallet?.play_credits || 0;
      const expertLevel = getExpertLevel(playCredits);

      const responseData = {
        user_id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        play_credits: playCredits,
        lifetime_credits: wallet?.lifetime_credits || 0,
        skill_level: skillStats?.skill_level || 0,
        games_played: profile.games_played_self || 0,
        member_since: profile.created_at,
        expert_level: {
          name: expertLevel.name,
          gradient: expertLevel.gradient,
          emoji: expertLevel.emoji,
        },
        match_history: {
          wins,
          losses,
          draws,
          total: wins + losses + draws,
          last5,
        },
      };

      console.log(`[public-profile-api] Successfully fetched profile for ${username}`);
      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "match-history" && userId) {
      console.log(`[public-profile-api] Fetching match history for userId: ${userId}`);

      // Get extended match history
      const { data: matches, error: matchError } = await supabaseAdmin
        .from("match_analyses")
        .select("id, result, credits_awarded, skill_level_snapshot, analyzed_at, metadata")
        .eq("user_id", userId)
        .eq("status", "analyzed")
        .order("analyzed_at", { ascending: false })
        .limit(20);

      if (matchError) {
        console.error("[public-profile-api] Match history error:", matchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch match history" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const wins = matches?.filter(m => m.result === "W").length || 0;
      const losses = matches?.filter(m => m.result === "L").length || 0;
      const draws = matches?.filter(m => m.result === "D").length || 0;

      return new Response(
        JSON.stringify({
          matches: matches || [],
          stats: { wins, losses, draws, total: wins + losses + draws },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[public-profile-api] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
