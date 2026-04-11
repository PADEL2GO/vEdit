import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-camera-api-key",
};

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[CAMERA-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
}

// Hash API key using SHA-256 with salt
async function hashApiKey(key: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Legacy hash without salt (for backward compatibility during migration)
async function hashApiKeyLegacy(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1] || "";

    logStep("Processing request", { action, method: req.method });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate API key for camera endpoints
    const apiKey = req.headers.get("x-camera-api-key");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing X-Camera-API-Key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find key by checking all active keys
    // First try salted keys, then fall back to legacy unsalted
    const { data: allActiveKeys, error: keysError } = await adminClient
      .from("camera_api_keys")
      .select("id, location_id, name, is_active, api_key_hash, salt")
      .eq("is_active", true);

    if (keysError) {
      logStep("Error fetching API keys", { error: keysError.message });
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let apiKeyRecord: { id: string; location_id: string; name: string; is_active: boolean } | null = null;

    for (const key of allActiveKeys || []) {
      if (key.salt) {
        // Salted hash comparison
        const saltedHash = await hashApiKey(apiKey, key.salt);
        if (saltedHash === key.api_key_hash) {
          apiKeyRecord = key;
          break;
        }
      } else {
        // Legacy unsalted hash comparison
        const legacyHash = await hashApiKeyLegacy(apiKey);
        if (legacyHash === key.api_key_hash) {
          apiKeyRecord = key;
          break;
        }
      }
    }

    if (!apiKeyRecord) {
      logStep("Invalid API key");
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await adminClient
      .from("camera_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyRecord.id);

    logStep("API key validated", { keyName: apiKeyRecord.name, locationId: apiKeyRecord.location_id });

    // ============================================
    // POST /start-session - Create a new camera session
    // ============================================
    if (action === "start-session" && req.method === "POST") {
      const { session_id, court_id, booking_id, players } = await req.json();

      if (!session_id || !court_id) {
        return new Response(JSON.stringify({ error: "session_id and court_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate court belongs to the location of this API key
      const { data: court, error: courtError } = await adminClient
        .from("courts")
        .select("id, location_id, name")
        .eq("id", court_id)
        .maybeSingle();

      if (courtError || !court) {
        return new Response(JSON.stringify({ error: "Court not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (court.location_id !== apiKeyRecord.location_id) {
        return new Response(JSON.stringify({ error: "Court does not belong to this location" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing session
      const { data: existingSession } = await adminClient
        .from("camera_sessions")
        .select("id, status")
        .eq("session_id", session_id)
        .maybeSingle();

      if (existingSession) {
        return new Response(JSON.stringify({ 
          error: "Session already exists", 
          existing_status: existingSession.status 
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create session
      const { data: session, error: sessionError } = await adminClient
        .from("camera_sessions")
        .insert({
          session_id,
          court_id,
          booking_id: booking_id || null,
          status: "ACTIVE",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        logStep("Session create error", { error: sessionError.message });
        return new Response(JSON.stringify({ error: sessionError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add players if provided
      if (players && Array.isArray(players) && players.length > 0) {
        const playerInserts = players.map((p: { user_id: string; team: number; position: string }) => ({
          session_id: session.id,
          user_id: p.user_id,
          team: p.team,
          position: p.position,
          scanned_at: new Date().toISOString(),
        }));

        const { error: playersError } = await adminClient
          .from("camera_session_players")
          .insert(playerInserts);

        if (playersError) {
          logStep("Players insert error", { error: playersError.message });
          // Don't fail the whole request, just log
        }
      }

      logStep("Session created", { sessionId: session.id, courtId: court_id });

      return new Response(
        JSON.stringify({ 
          success: true, 
          session_id: session.id,
          court_name: court.name,
          status: "ACTIVE" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // POST /join-session - Add a player to session
    // ============================================
    if (action === "join-session" && req.method === "POST") {
      const { session_id, user_id, team, position } = await req.json();

      if (!session_id || !user_id || !team || !position) {
        return new Response(JSON.stringify({ error: "session_id, user_id, team, and position required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find session
      const { data: session, error: sessionError } = await adminClient
        .from("camera_sessions")
        .select("id, status, court_id")
        .eq("session_id", session_id)
        .maybeSingle();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.status !== "ACTIVE" && session.status !== "PENDING") {
        return new Response(JSON.stringify({ error: "Session is not active" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if player already in session
      const { data: existingPlayer } = await adminClient
        .from("camera_session_players")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_id", user_id)
        .maybeSingle();

      if (existingPlayer) {
        return new Response(JSON.stringify({ error: "Player already in session" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add player
      const { error: insertError } = await adminClient
        .from("camera_session_players")
        .insert({
          session_id: session.id,
          user_id,
          team,
          position,
          scanned_at: new Date().toISOString(),
        });

      if (insertError) {
        logStep("Player insert error", { error: insertError.message });
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Player joined session", { sessionId: session.id, userId: user_id, team, position });

      return new Response(
        JSON.stringify({ success: true, message: "Player joined session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // POST /match-complete - Process match results
    // ============================================
    if (action === "match-complete" && req.method === "POST") {
      const { 
        session_id, 
        match_duration_seconds, 
        final_score, 
        player_analyses 
      } = await req.json();

      if (!session_id || !player_analyses || !Array.isArray(player_analyses)) {
        return new Response(JSON.stringify({ error: "session_id and player_analyses required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find session
      const { data: session, error: sessionError } = await adminClient
        .from("camera_sessions")
        .select("*")
        .eq("session_id", session_id)
        .maybeSingle();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.status === "COMPLETED") {
        return new Response(JSON.stringify({ error: "Session already completed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update session to PROCESSING
      await adminClient
        .from("camera_sessions")
        .update({ 
          status: "PROCESSING",
          raw_data: { match_duration_seconds, final_score, player_analyses }
        })
        .eq("id", session.id);

      // Get skill credits config
      const { data: config } = await adminClient
        .from("skill_credits_config")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      const baseMultiplier = config?.base_multiplier || 1.0;
      const maxCredits = config?.max_credits_per_match || 500;
      const roundingPolicy = config?.rounding_policy || "floor";
      const formulaVersion = config?.formula_version || 1;

      const results: Array<{
        user_id: string;
        credits_awarded: number;
        new_skill_level: number;
        match_analysis_id: string;
      }> = [];

      // Determine win/loss for each team
      const team1Wins = final_score && final_score.team1 > final_score.team2;
      const team2Wins = final_score && final_score.team2 > final_score.team1;

      // Process each player
      for (const playerData of player_analyses) {
        const { 
          user_id, 
          team,
          ai_score, 
          match_overview, 
          serve_performance, 
          stroke_performance, 
          movement 
        } = playerData;

        if (!user_id || ai_score === undefined) {
          logStep("Skipping player - missing data", { user_id, ai_score });
          continue;
        }

        try {
          // Get current skill level
          const { data: skillStats } = await adminClient
            .from("skill_stats")
            .select("skill_level")
            .eq("user_id", user_id)
            .maybeSingle();

          const currentSkillLevel = skillStats?.skill_level || 1;

          // Calculate credits
          let rawCredits = currentSkillLevel * ai_score * baseMultiplier;
          let credits: number;
          switch (roundingPolicy) {
            case "ceil": credits = Math.ceil(rawCredits); break;
            case "round": credits = Math.round(rawCredits); break;
            default: credits = Math.floor(rawCredits);
          }
          credits = Math.min(credits, maxCredits);

          // Determine result (W, L, D for database constraint)
          let result: "W" | "L" | "D" = "D";
          if ((team === 1 && team1Wins) || (team === 2 && team2Wins)) {
            result = "W";
          } else if ((team === 1 && team2Wins) || (team === 2 && team1Wins)) {
            result = "L";
          }

          // Find partner and opponents from session players
          const { data: sessionPlayers } = await adminClient
            .from("camera_session_players")
            .select("user_id, team, position")
            .eq("session_id", session.id);

          const partner = sessionPlayers?.find(p => p.team === team && p.user_id !== user_id);
          const opponents = sessionPlayers?.filter(p => p.team !== team) || [];

          // Build metadata
          const metadata = {
            source: "camera",
            camera_session_id: session.id,
            match_duration_seconds,
            final_score,
            match_overview,
            serve_performance,
            stroke_performance,
            movement,
            partner_user_id: partner?.user_id || null,
            opponent_1_user_id: opponents[0]?.user_id || null,
            opponent_2_user_id: opponents[1]?.user_id || null,
          };

          // Create match analysis
          const matchId = `cam-${session.session_id}-${user_id.substring(0, 8)}`;
          
          const { data: analysis, error: analysisError } = await adminClient
            .from("match_analyses")
            .insert({
              match_id: matchId,
              user_id,
              ai_score,
              skill_level_snapshot: currentSkillLevel,
              formula_version: formulaVersion,
              credits_awarded: credits,
              status: "COMPLETED",
              result,
              analyzed_at: new Date().toISOString(),
              metadata,
              opponent_user_id: opponents[0]?.user_id || null,
            })
            .select()
            .single();

          if (analysisError) {
            logStep("Match analysis error", { user_id, error: analysisError.message });
            continue;
          }

          // Link session player to match analysis
          await adminClient
            .from("camera_session_players")
            .update({ match_analysis_id: analysis.id })
            .eq("session_id", session.id)
            .eq("user_id", user_id);

          // Get current balance
          const { data: currentLedger } = await adminClient
            .from("points_ledger")
            .select("delta_points")
            .eq("user_id", user_id)
            .eq("credit_type", "SKILL");

          const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

          // Create ledger entry
          await adminClient.from("points_ledger").insert({
            user_id,
            credit_type: "SKILL",
            delta_points: credits,
            balance_after: currentBalance + credits,
            entry_type: "AUTO_CREDIT",
            description: `KI-Analyse Match ${matchId}`,
            source_type: "camera_match",
            source_id: analysis.id,
          });

          // Update wallet
          const { data: wallet } = await adminClient
            .from("wallets")
            .select("play_credits, lifetime_credits")
            .eq("user_id", user_id)
            .maybeSingle();

          const newPlayCredits = (wallet?.play_credits || 0) + credits;
          const newLifetimeCredits = (wallet?.lifetime_credits || 0) + credits;

          await adminClient
            .from("wallets")
            .update({
              play_credits: newPlayCredits,
              lifetime_credits: newLifetimeCredits,
              last_game_credits: credits,
              last_game_date: new Date().toISOString(),
            })
            .eq("user_id", user_id);

          // Recalculate skill level (average of last 5 matches)
          const { data: recentMatches } = await adminClient
            .from("match_analyses")
            .select("ai_score")
            .eq("user_id", user_id)
            .eq("status", "COMPLETED")
            .order("analyzed_at", { ascending: false })
            .limit(5);

          let newSkillLevel = currentSkillLevel;
          if (recentMatches && recentMatches.length > 0) {
            const avgScore = recentMatches.reduce((sum, m) => sum + (m.ai_score || 0), 0) / recentMatches.length;
            newSkillLevel = Math.round(avgScore * 10) / 10;
            
            await adminClient
              .from("skill_stats")
              .upsert({
                user_id,
                skill_level: newSkillLevel,
                last_ai_update: new Date().toISOString(),
              });
          }

          // Create notification
          await adminClient.from("notifications").insert({
            user_id,
            type: "match_analyzed",
            title: "Match analysiert! 🎾",
            message: `Du hast ${credits} Play Credits erhalten! AI Score: ${ai_score}`,
            cta_url: "/app/p2g-points",
            metadata: { 
              credits_awarded: credits, 
              ai_score, 
              match_analysis_id: analysis.id 
            },
          });

          results.push({
            user_id,
            credits_awarded: credits,
            new_skill_level: newSkillLevel,
            match_analysis_id: analysis.id,
          });

          logStep("Player processed", { user_id, credits, newSkillLevel, result });

        } catch (playerError) {
          logStep("Player processing error", { 
            user_id, 
            error: playerError instanceof Error ? playerError.message : "Unknown error" 
          });
        }
      }

      // Update session to COMPLETED
      await adminClient
        .from("camera_sessions")
        .update({
          status: "COMPLETED",
          ended_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      logStep("Match complete processed", { 
        sessionId: session.id, 
        playersProcessed: results.length 
      });

      return new Response(
        JSON.stringify({
          success: true,
          session_id: session.id,
          players_processed: results.length,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // GET /session-status - Check session status
    // ============================================
    if (action === "session-status" && req.method === "GET") {
      const sessionId = url.searchParams.get("session_id");

      if (!sessionId) {
        return new Response(JSON.stringify({ error: "session_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session, error } = await adminClient
        .from("camera_sessions")
        .select(`
          *,
          camera_session_players (
            user_id,
            team,
            position,
            scanned_at,
            match_analysis_id
          )
        `)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (error || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify(session),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("Unhandled error", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
