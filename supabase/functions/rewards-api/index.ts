import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[rewards-api] ${step}`, details ? JSON.stringify(details) : "");
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
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse action from body or URL path
    let action = "";
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
      action = (body.action as string) || "";
    } else {
      const url = new URL(req.url);
      action = url.pathname.split("/").pop() || "";
    }

    logStep("Request", { action, method: req.method, userId: user.id });

    // Helper to create reward instance
    const createRewardInstance = async (
      userId: string,
      definitionKey: string,
      sourceType: string,
      sourceId: string,
      instanceMetadata?: Record<string, unknown>,
      overrideStatus?: string // Allow overriding status for admin approval flow
    ): Promise<{ success: boolean; instance?: unknown; reason?: string }> => {
      // Get definition
      const { data: def } = await supabaseAdmin
        .from("reward_definitions")
        .select("*")
        .eq("key", definitionKey)
        .eq("is_active", true)
        .single();

      if (!def) {
        return { success: false, reason: "Definition not found" };
      }

      // Check daily cap for DAILY_LOGIN
      if (def.caps?.daily_max) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await supabaseAdmin
          .from("reward_instances")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("definition_key", definitionKey)
          .neq("status", "REVERSED")
          .neq("status", "REJECTED")
          .gte("created_at", startOfDay.toISOString());
        if ((count || 0) >= def.caps.daily_max) {
          return { success: false, reason: "Daily cap reached" };
        }
      }

      // Check monthly cap
      if (def.caps?.monthly_max) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count } = await supabaseAdmin
          .from("reward_instances")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("definition_key", definitionKey)
          .neq("status", "REVERSED")
          .neq("status", "REJECTED")
          .gte("created_at", startOfMonth.toISOString());
        if ((count || 0) >= def.caps.monthly_max) {
          return { success: false, reason: "Monthly cap reached" };
        }
      }

      // Check total cap
      if (def.caps?.total_max) {
        const { count } = await supabaseAdmin
          .from("reward_instances")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("definition_key", definitionKey)
          .neq("status", "REVERSED")
          .neq("status", "REJECTED");
        if ((count || 0) >= def.caps.total_max) {
          return { success: false, reason: "Total cap reached" };
        }
      }

      // Check idempotency for same source
      const { data: existing } = await supabaseAdmin
        .from("reward_instances")
        .select("id")
        .eq("definition_key", definitionKey)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .single();

      if (existing) {
        return { success: false, reason: "Already claimed for this source" };
      }

      const points = def.points_rule.type === "fixed" ? def.points_rule.value : 0;
      const now = new Date();
      const expiresAt = def.expiry_days
        ? new Date(now.getTime() + def.expiry_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Use override status if provided, otherwise default to AVAILABLE
      const status = overrideStatus || "AVAILABLE";
      const availableAt = status === "AVAILABLE" ? now.toISOString() : null;

      const { data: instance, error } = await supabaseAdmin
        .from("reward_instances")
        .insert({
          user_id: userId,
          definition_key: definitionKey,
          status,
          points,
          source_type: sourceType,
          source_id: sourceId,
          available_at: availableAt,
          expires_at: expiresAt,
          metadata: instanceMetadata || {},
        })
        .select()
        .single();

      if (error) {
        logStep("Failed to create reward", { error: error.message });
        return { success: false, reason: error.message };
      }

      // Create notification based on status
      if (status === "PENDING_APPROVAL") {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "REWARD_PENDING_APPROVAL",
          title: "Bonus wird geprüft",
          message: `Dein ${def.title} wird geprüft und bald gutgeschrieben.`,
          cta_url: "/dashboard/rewards",
          metadata: { reward_instance_id: instance.id, points },
        });
      } else {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "REWARD_AVAILABLE",
          title: def.title,
          message: `Du hast ${points} Credits verdient! Claim sie jetzt.`,
          cta_url: "/dashboard/rewards",
          metadata: { reward_instance_id: instance.id, points },
        });
      }

      return { success: true, instance };
    };

    if (action === "summary") {
      // GET /rewards-api/summary
      const { data: balance } = await supabaseAdmin.rpc("get_user_rewards_balance", {
        p_user_id: user.id,
      });

      const { count: claimableCount } = await supabaseAdmin
        .from("reward_instances")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "AVAILABLE");

      // Count PENDING and PENDING_APPROVAL as pending
      const { count: pendingCount } = await supabaseAdmin
        .from("reward_instances")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["PENDING", "PENDING_APPROVAL"]);

      return new Response(JSON.stringify({
        balance: balance || 0,
        claimableCount: claimableCount || 0,
        pendingCount: pendingCount || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "list") {
      // GET /rewards-api/list
      const { data: instances } = await supabaseAdmin
        .from("reward_instances")
        .select(`
          *,
          reward_definitions (
            key,
            title,
            description,
            category
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const claimable = instances?.filter(i => i.status === "AVAILABLE") || [];
      // Include PENDING_APPROVAL in pending list
      const pending = instances?.filter(i => ["PENDING", "PENDING_APPROVAL"].includes(i.status)) || [];
      const history = instances?.filter(i => ["CLAIMED", "REVERSED", "EXPIRED", "REJECTED"].includes(i.status)) || [];

      return new Response(JSON.stringify({
        claimable,
        pending,
        history,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "definitions") {
      const { data: definitions } = await supabaseAdmin
        .from("reward_definitions")
        .select("*")
        .eq("is_active", true)
        .order("category");

      return new Response(JSON.stringify({ definitions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "ledger") {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const { data: entries } = await supabaseAdmin
        .from("points_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return new Response(JSON.stringify({ entries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // DAILY_LOGIN - triggered once per day on app access with streak tracking
    if (action === "daily_login") {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const sourceId = `${user.id}:${today}`;

      // Daily login is immediate - no approval needed
      const result = await createRewardInstance(user.id, "DAILY_LOGIN", "daily_login", sourceId);

      if (!result.success) {
        logStep("Daily login reward not granted", { reason: result.reason });
        return new Response(JSON.stringify({ 
          success: false, 
          reason: result.reason,
          alreadyClaimed: result.reason === "Already claimed for this source" || result.reason === "Daily cap reached"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Daily login reward created", { instanceId: (result.instance as { id: string })?.id });

      // Track login streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Get or create user streak
      const { data: existingStreak } = await supabaseAdmin
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .eq("streak_type", "DAILY_LOGIN")
        .maybeSingle();

      let currentStreak = 1;
      let bestStreak = 1;
      let lastBonusMilestone = 0;

      if (existingStreak) {
        const lastDate = existingStreak.last_qualified_date;
        const isConsecutive = lastDate === yesterdayStr;
        
        if (isConsecutive) {
          currentStreak = existingStreak.current_streak + 1;
        } else if (lastDate === today) {
          // Already counted today
          currentStreak = existingStreak.current_streak;
        } else {
          // Streak broken, start fresh
          currentStreak = 1;
        }
        
        bestStreak = Math.max(existingStreak.best_streak, currentStreak);
        lastBonusMilestone = existingStreak.last_bonus_milestone || 0;

        await supabaseAdmin
          .from("user_streaks")
          .update({
            current_streak: currentStreak,
            best_streak: bestStreak,
            last_qualified_date: today,
          })
          .eq("id", existingStreak.id);

        logStep("Updated login streak", { currentStreak, bestStreak });
      } else {
        // Create first streak entry
        await supabaseAdmin
          .from("user_streaks")
          .insert({
            user_id: user.id,
            streak_type: "DAILY_LOGIN",
            current_streak: 1,
            best_streak: 1,
            last_qualified_date: today,
            last_bonus_milestone: 0,
          });

        logStep("Created first login streak entry");
      }

      // Check for streak milestones and award bonus
      const milestones = [
        { days: 7, bonus: 15, label: "7-Tage Login-Streak" },
        { days: 14, bonus: 30, label: "14-Tage Login-Streak" },
        { days: 30, bonus: 75, label: "30-Tage Login-Streak" },
      ];

      for (const milestone of milestones) {
        if (currentStreak >= milestone.days && lastBonusMilestone < milestone.days) {
          // Award streak bonus
          const streakSourceId = `login_streak:${user.id}:${milestone.days}:${today}`;
          
          // Check if not already awarded
          const { data: existingBonus } = await supabaseAdmin
            .from("reward_instances")
            .select("id")
            .eq("source_id", streakSourceId)
            .maybeSingle();

          if (!existingBonus) {
            // Get current balance
            const { data: currentLedger } = await supabaseAdmin
              .from("points_ledger")
              .select("delta_points")
              .eq("user_id", user.id)
              .eq("credit_type", "REWARD");

            const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
            const newBalance = currentBalance + milestone.bonus;

            // Create reward instance
            const { data: bonusInstance } = await supabaseAdmin
              .from("reward_instances")
              .insert({
                user_id: user.id,
                definition_key: "DAILY_LOGIN",
                status: "CLAIMED",
                points: milestone.bonus,
                source_type: "login_streak_bonus",
                source_id: streakSourceId,
                available_at: new Date().toISOString(),
                claimed_at: new Date().toISOString(),
                metadata: { streak_days: milestone.days, bonus_type: "streak_milestone" },
              })
              .select()
              .single();

            // Create ledger entry
            await supabaseAdmin.from("points_ledger").insert({
              user_id: user.id,
              credit_type: "REWARD",
              delta_points: milestone.bonus,
              balance_after: newBalance,
              entry_type: "STREAK_BONUS",
              description: milestone.label,
              source_type: "login_streak_bonus",
              source_id: streakSourceId,
              reward_instance_id: bonusInstance?.id,
            });

            // Update wallet
            const { data: wallet } = await supabaseAdmin
              .from("wallets")
              .select("reward_credits, lifetime_credits")
              .eq("user_id", user.id)
              .maybeSingle();

            if (wallet) {
              await supabaseAdmin
                .from("wallets")
                .update({
                  reward_credits: (wallet.reward_credits || 0) + milestone.bonus,
                  lifetime_credits: (wallet.lifetime_credits || 0) + milestone.bonus,
                })
                .eq("user_id", user.id);
            }

            // Update milestone tracker
            await supabaseAdmin
              .from("user_streaks")
              .update({ last_bonus_milestone: milestone.days })
              .eq("user_id", user.id)
              .eq("streak_type", "DAILY_LOGIN");

            // Create notification
            await supabaseAdmin.from("notifications").insert({
              user_id: user.id,
              type: "STREAK_BONUS",
              title: `${milestone.label}! +${milestone.bonus} Credits`,
              message: `Du hast ${milestone.days} Tage in Folge eingeloggt! Weiter so!`,
              cta_url: "/dashboard/p2g-points",
              metadata: { streak_days: milestone.days, bonus: milestone.bonus },
            });

            logStep("Awarded streak bonus", { milestone: milestone.days, bonus: milestone.bonus });
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        instance: result.instance,
        streak: currentStreak,
        message: currentStreak > 1 
          ? `Täglicher Login-Bonus! Streak: ${currentStreak} Tage` 
          : "Täglicher Login-Bonus gutgeschrieben!"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // INSTAGRAM_TAG - user submits their Instagram handle/post URL
    // This requires admin approval
    if (action === "instagram_tag") {
      const { instagramHandle, postUrl } = body as { instagramHandle?: string; postUrl?: string };

      if (!instagramHandle && !postUrl) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Instagram handle or post URL required" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Create unique source ID per submission (allow multiple per month up to cap)
      const timestamp = Date.now();
      const sourceId = `instagram:${user.id}:${timestamp}`;

      // Instagram tag requires admin approval - set status to PENDING_APPROVAL
      const result = await createRewardInstance(
        user.id, 
        "INSTAGRAM_TAG", 
        "instagram", 
        sourceId,
        { instagramHandle, postUrl, submittedAt: new Date().toISOString() },
        "PENDING_APPROVAL" // Override status for admin approval
      );

      if (!result.success) {
        return new Response(JSON.stringify({ 
          success: false, 
          reason: result.reason 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Instagram tag reward created (pending approval)", { instanceId: (result.instance as { id: string })?.id });
      return new Response(JSON.stringify({ 
        success: true, 
        instance: result.instance,
        message: "Instagram-Bonus eingereicht! Wird geprüft."
      }), {
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
