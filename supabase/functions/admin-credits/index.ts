import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[admin-credits] ${step}`, details ? JSON.stringify(details) : "");
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

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Admin access required");
    }

    const body = await req.json();
    const { action } = body;

    logStep("Request", { action, adminId: user.id });

    // GET all user wallets with profile info
    if (action === "list_wallets") {
      const { data: wallets, error } = await supabaseAdmin
        .from("wallets")
        .select(`
          user_id,
          play_credits,
          reward_credits,
          lifetime_credits,
          updated_at
        `)
        .order("lifetime_credits", { ascending: false });

      if (error) throw error;

      // Get profiles for display names
      const userIds = wallets?.map(w => w.user_id) || [];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedWallets = wallets?.map(w => ({
        ...w,
        profile: profilesMap.get(w.user_id) || null,
      }));

      return new Response(JSON.stringify({ wallets: enrichedWallets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // GET single user wallet details
    if (action === "get_wallet") {
      const { userId } = body;
      if (!userId) throw new Error("userId required");

      const { data: wallet, error } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      // Get recent ledger entries
      const { data: ledger } = await supabaseAdmin
        .from("points_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ wallet, ledger, profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ADJUST credits manually
    if (action === "adjust_credits") {
      const { userId, amount, reason, creditType } = body;
      
      if (!userId || amount === undefined || !reason) {
        throw new Error("userId, amount, and reason required");
      }

      const type = creditType || "reward"; // "reward" or "play"
      const points = parseInt(amount);

      if (isNaN(points) || points === 0) {
        throw new Error("Invalid amount");
      }

      // Get current balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("reward_credits, play_credits, lifetime_credits")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) {
        throw new Error("Wallet not found");
      }

      const currentBalance = type === "reward" ? wallet.reward_credits : wallet.play_credits;
      const newBalance = currentBalance + points;

      if (newBalance < 0) {
        throw new Error("Resulting balance cannot be negative");
      }

      // Create ledger entry
      const { error: ledgerError } = await supabaseAdmin
        .from("points_ledger")
        .insert({
          user_id: userId,
          delta_points: points,
          entry_type: points > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          balance_after: newBalance,
          description: `Admin: ${reason}`,
          credit_type: type === "reward" ? "REWARD" : "SKILL",
        });

      if (ledgerError) throw ledgerError;

      // Update wallet
      const updateData: Record<string, number | string> = {
        updated_at: new Date().toISOString(),
      };
      
      if (type === "reward") {
        updateData.reward_credits = newBalance;
        if (points > 0) {
          updateData.lifetime_credits = wallet.lifetime_credits + points;
        }
      } else {
        updateData.play_credits = newBalance;
      }

      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Create notification for user
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: points > 0 ? "CREDIT_RECEIVED" : "CREDIT_DEDUCTED",
        title: points > 0 ? "Credits gutgeschrieben" : "Credits abgezogen",
        message: `${Math.abs(points)} ${type === "reward" ? "Reward" : "Play"} Credits: ${reason}`,
        cta_url: "/dashboard/p2g-points",
        metadata: { amount: points, reason, adjusted_by: user.id },
      });

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "CREDIT_ADJUSTMENT",
        target_type: "wallet",
        target_id: userId,
        details: { amount: points, reason, credit_type: type, new_balance: newBalance },
      });

      logStep("Credit adjustment complete", { userId, amount: points, newBalance });

      return new Response(JSON.stringify({ 
        success: true, 
        newBalance,
        adjustment: points,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // GET credit stats
    if (action === "stats") {
      // Total credits in circulation
      const { data: totals } = await supabaseAdmin
        .from("wallets")
        .select("reward_credits, play_credits, lifetime_credits");

      const totalRewardCredits = totals?.reduce((sum, w) => sum + (w.reward_credits || 0), 0) || 0;
      const totalPlayCredits = totals?.reduce((sum, w) => sum + (w.play_credits || 0), 0) || 0;
      const totalLifetimeCredits = totals?.reduce((sum, w) => sum + (w.lifetime_credits || 0), 0) || 0;

      // Pending rewards (PENDING status)
      const { count: pendingRewards } = await supabaseAdmin
        .from("reward_instances")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");

      // Pending approval rewards
      const { count: pendingApprovalRewards } = await supabaseAdmin
        .from("reward_instances")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING_APPROVAL");

      // Claimable rewards
      const { count: claimableRewards } = await supabaseAdmin
        .from("reward_instances")
        .select("*", { count: "exact", head: true })
        .eq("status", "AVAILABLE");

      // Recent redemptions (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentRedemptions } = await supabaseAdmin
        .from("marketplace_redemptions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      return new Response(JSON.stringify({
        totalRewardCredits,
        totalPlayCredits,
        totalLifetimeCredits,
        pendingRewards: pendingRewards || 0,
        pendingApprovalRewards: pendingApprovalRewards || 0,
        claimableRewards: claimableRewards || 0,
        recentRedemptions: recentRedemptions || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // LIST pending approval rewards - includes PENDING_APPROVAL and PENDING with approval_required=true
    if (action === "list_pending_approvals") {
      // Get all rewards that need approval: PENDING_APPROVAL status OR PENDING with approval_required definition
      const { data: pendingApprovalRewards, error: paError } = await supabaseAdmin
        .from("reward_instances")
        .select(`
          *,
          reward_definitions (
            key,
            title,
            description,
            category,
            points_rule,
            approval_required,
            awarding_mode
          )
        `)
        .eq("status", "PENDING_APPROVAL")
        .order("created_at", { ascending: false });

      if (paError) throw paError;

      // Also get PENDING rewards where definition has approval_required = true (inconsistent state)
      const { data: pendingRewards, error: pError } = await supabaseAdmin
        .from("reward_instances")
        .select(`
          *,
          reward_definitions (
            key,
            title,
            description,
            category,
            points_rule,
            approval_required,
            awarding_mode
          )
        `)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (pError) throw pError;

      // Filter PENDING to only those that have approval_required=true (these are in inconsistent state)
      const pendingNeedingApproval = pendingRewards?.filter(r => 
        r.reward_definitions?.approval_required === true
      ) || [];

      // Combine both lists
      const allPending = [
        ...(pendingApprovalRewards || []),
        ...pendingNeedingApproval.map(r => ({ ...r, _inconsistent: true }))
      ];

      // Get profiles for display names
      const userIds = [...new Set(allPending.map(r => r.user_id))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedRewards = allPending.map(r => ({
        ...r,
        profile: profilesMap.get(r.user_id) || null,
      }));

      return new Response(JSON.stringify({ rewards: enrichedRewards }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // APPROVE a reward
    if (action === "approve_reward") {
      const { rewardInstanceId } = body;
      if (!rewardInstanceId) throw new Error("rewardInstanceId required");

      // Get the reward instance
      const { data: reward, error: rewardError } = await supabaseAdmin
        .from("reward_instances")
        .select("*, reward_definitions(title, awarding_mode)")
        .eq("id", rewardInstanceId)
        .single();

      if (rewardError || !reward) {
        throw new Error("Reward not found");
      }

      // Accept both PENDING_APPROVAL and PENDING (for backwards compatibility with approval_required rewards)
      if (reward.status !== "PENDING_APPROVAL" && reward.status !== "PENDING") {
        throw new Error("Reward is not pending approval");
      }

      const now = new Date().toISOString();
      const def = reward.reward_definitions as { title: string; awarding_mode: string } | null;
      const shouldAutoClaim = def?.awarding_mode === "AUTO_CLAIM";

      if (shouldAutoClaim) {
        // Auto-claim: credit immediately
        const { data: currentLedger } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", reward.user_id)
          .eq("credit_type", "REWARD");

        const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
        const newBalance = currentBalance + reward.points;

        // Update to CLAIMED
        const { error: updateError } = await supabaseAdmin
          .from("reward_instances")
          .update({
            status: "CLAIMED",
            available_at: now,
            claimed_at: now,
            metadata: { ...reward.metadata, approved_by: user.id, approved_at: now, auto_claimed: true },
          })
          .eq("id", rewardInstanceId);

        if (updateError) throw updateError;

        // Create ledger entry
        await supabaseAdmin.from("points_ledger").insert({
          user_id: reward.user_id,
          credit_type: "REWARD",
          delta_points: reward.points,
          balance_after: newBalance,
          entry_type: "ADMIN_APPROVED",
          description: def?.title || reward.definition_key,
          reward_instance_id: rewardInstanceId,
        });

        // Update wallet
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("reward_credits, lifetime_credits")
          .eq("user_id", reward.user_id)
          .maybeSingle();

        if (wallet) {
          await supabaseAdmin
            .from("wallets")
            .update({
              reward_credits: (wallet.reward_credits || 0) + reward.points,
              lifetime_credits: (wallet.lifetime_credits || 0) + reward.points,
            })
            .eq("user_id", reward.user_id);
        }

        // Create notification
        await supabaseAdmin.from("notifications").insert({
          user_id: reward.user_id,
          type: "REWARD_CREDITED",
          title: `${reward.points} Credits gutgeschrieben!`,
          message: `${def?.title || "Bonus"} wurde freigegeben und automatisch gutgeschrieben.`,
          cta_url: "/dashboard/p2g-points",
          metadata: { reward_instance_id: rewardInstanceId, points: reward.points },
        });
      } else {
        // Make available for claiming
        const { error: updateError } = await supabaseAdmin
          .from("reward_instances")
          .update({
            status: "AVAILABLE",
            available_at: now,
            metadata: { ...reward.metadata, approved_by: user.id, approved_at: now },
          })
          .eq("id", rewardInstanceId);

        if (updateError) throw updateError;

        // Create notification for user
        await supabaseAdmin.from("notifications").insert({
          user_id: reward.user_id,
          type: "REWARD_APPROVED",
          title: "Bonus freigegeben!",
          message: `${def?.title || "Bonus"} (${reward.points} Credits) wurde freigegeben – jetzt einlösen!`,
          cta_url: "/dashboard/p2g-points",
          metadata: { reward_instance_id: rewardInstanceId, points: reward.points },
        });
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REWARD_APPROVED",
        target_type: "reward_instance",
        target_id: rewardInstanceId,
        details: { user_id: reward.user_id, points: reward.points, definition_key: reward.definition_key, auto_claimed: shouldAutoClaim },
      });

      logStep("Reward approved", { rewardInstanceId, userId: reward.user_id, points: reward.points, autoClaimed: shouldAutoClaim });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // REJECT a reward
    if (action === "reject_reward") {
      const { rewardInstanceId, reason } = body;
      if (!rewardInstanceId) throw new Error("rewardInstanceId required");

      // Get the reward instance
      const { data: reward, error: rewardError } = await supabaseAdmin
        .from("reward_instances")
        .select("*, reward_definitions(title)")
        .eq("id", rewardInstanceId)
        .single();

      if (rewardError || !reward) {
        throw new Error("Reward not found");
      }

      // Accept both PENDING_APPROVAL and PENDING (for backwards compatibility)
      if (reward.status !== "PENDING_APPROVAL" && reward.status !== "PENDING") {
        throw new Error("Reward is not pending approval");
      }

      // Update status to REJECTED
      const now = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("reward_instances")
        .update({
          status: "REJECTED",
          reversed_at: now,
          metadata: { ...reward.metadata, rejected_by: user.id, rejected_at: now, rejection_reason: reason },
        })
        .eq("id", rewardInstanceId);

      if (updateError) throw updateError;

      // Create notification for user
      await supabaseAdmin.from("notifications").insert({
        user_id: reward.user_id,
        type: "REWARD_REJECTED",
        title: "Bonus abgelehnt",
        message: reason || `Dein ${reward.reward_definitions?.title || "Bonus"} konnte leider nicht freigegeben werden.`,
        cta_url: "/dashboard/p2g-points",
        metadata: { reward_instance_id: rewardInstanceId, reason },
      });

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REWARD_REJECTED",
        target_type: "reward_instance",
        target_id: rewardInstanceId,
        details: { user_id: reward.user_id, points: reward.points, definition_key: reward.definition_key, reason },
      });

      logStep("Reward rejected", { rewardInstanceId, userId: reward.user_id, reason });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // BULK APPROVE multiple rewards
    if (action === "bulk_approve_rewards") {
      const { rewardInstanceIds } = body;
      if (!rewardInstanceIds || !Array.isArray(rewardInstanceIds) || rewardInstanceIds.length === 0) {
        throw new Error("rewardInstanceIds array required");
      }

      logStep("Bulk approve started", { count: rewardInstanceIds.length });

      let approved = 0;
      let totalPoints = 0;
      const now = new Date().toISOString();

      for (const rewardInstanceId of rewardInstanceIds) {
        try {
          // Get the reward instance
          const { data: reward, error: rewardError } = await supabaseAdmin
            .from("reward_instances")
            .select("*, reward_definitions(title, awarding_mode)")
            .eq("id", rewardInstanceId)
            .single();

          if (rewardError || !reward) {
            logStep("Reward not found in bulk", { rewardInstanceId });
            continue;
          }

          if (reward.status !== "PENDING_APPROVAL" && reward.status !== "PENDING") {
            logStep("Reward not pending in bulk", { rewardInstanceId, status: reward.status });
            continue;
          }

          const def = reward.reward_definitions as { title: string; awarding_mode: string } | null;
          const shouldAutoClaim = def?.awarding_mode === "AUTO_CLAIM";

          if (shouldAutoClaim) {
            // Auto-claim: credit immediately
            const { data: currentLedger } = await supabaseAdmin
              .from("points_ledger")
              .select("delta_points")
              .eq("user_id", reward.user_id)
              .eq("credit_type", "REWARD");

            const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
            const newBalance = currentBalance + reward.points;

            await supabaseAdmin
              .from("reward_instances")
              .update({
                status: "CLAIMED",
                available_at: now,
                claimed_at: now,
                metadata: { ...reward.metadata, approved_by: user.id, approved_at: now, auto_claimed: true, bulk_action: true },
              })
              .eq("id", rewardInstanceId);

            await supabaseAdmin.from("points_ledger").insert({
              user_id: reward.user_id,
              credit_type: "REWARD",
              delta_points: reward.points,
              balance_after: newBalance,
              entry_type: "ADMIN_APPROVED",
              description: def?.title || reward.definition_key,
              reward_instance_id: rewardInstanceId,
            });

            const { data: wallet } = await supabaseAdmin
              .from("wallets")
              .select("reward_credits, lifetime_credits")
              .eq("user_id", reward.user_id)
              .maybeSingle();

            if (wallet) {
              await supabaseAdmin
                .from("wallets")
                .update({
                  reward_credits: (wallet.reward_credits || 0) + reward.points,
                  lifetime_credits: (wallet.lifetime_credits || 0) + reward.points,
                })
                .eq("user_id", reward.user_id);
            }

            await supabaseAdmin.from("notifications").insert({
              user_id: reward.user_id,
              type: "REWARD_CREDITED",
              title: `${reward.points} Credits gutgeschrieben!`,
              message: `${def?.title || "Bonus"} wurde freigegeben und automatisch gutgeschrieben.`,
              cta_url: "/dashboard/p2g-points",
              metadata: { reward_instance_id: rewardInstanceId, points: reward.points },
            });
          } else {
            await supabaseAdmin
              .from("reward_instances")
              .update({
                status: "AVAILABLE",
                available_at: now,
                metadata: { ...reward.metadata, approved_by: user.id, approved_at: now, bulk_action: true },
              })
              .eq("id", rewardInstanceId);

            await supabaseAdmin.from("notifications").insert({
              user_id: reward.user_id,
              type: "REWARD_APPROVED",
              title: "Bonus freigegeben!",
              message: `${def?.title || "Bonus"} (${reward.points} Credits) wurde freigegeben – jetzt einlösen!`,
              cta_url: "/dashboard/p2g-points",
              metadata: { reward_instance_id: rewardInstanceId, points: reward.points },
            });
          }

          approved++;
          totalPoints += reward.points;
        } catch (err) {
          logStep("Error in bulk approve loop", { rewardInstanceId, error: String(err) });
        }
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "BULK_REWARD_APPROVED",
        target_type: "reward_instances",
        details: { count: approved, total_points: totalPoints, reward_instance_ids: rewardInstanceIds },
      });

      logStep("Bulk approve complete", { approved, totalPoints });

      return new Response(JSON.stringify({ success: true, approved, total_points: totalPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // BULK REJECT multiple rewards
    if (action === "bulk_reject_rewards") {
      const { rewardInstanceIds, reason } = body;
      if (!rewardInstanceIds || !Array.isArray(rewardInstanceIds) || rewardInstanceIds.length === 0) {
        throw new Error("rewardInstanceIds array required");
      }

      logStep("Bulk reject started", { count: rewardInstanceIds.length });

      let rejected = 0;
      const now = new Date().toISOString();

      for (const rewardInstanceId of rewardInstanceIds) {
        try {
          const { data: reward, error: rewardError } = await supabaseAdmin
            .from("reward_instances")
            .select("*, reward_definitions(title)")
            .eq("id", rewardInstanceId)
            .single();

          if (rewardError || !reward) {
            logStep("Reward not found in bulk reject", { rewardInstanceId });
            continue;
          }

          if (reward.status !== "PENDING_APPROVAL" && reward.status !== "PENDING") {
            logStep("Reward not pending in bulk reject", { rewardInstanceId, status: reward.status });
            continue;
          }

          await supabaseAdmin
            .from("reward_instances")
            .update({
              status: "REJECTED",
              reversed_at: now,
              metadata: { ...reward.metadata, rejected_by: user.id, rejected_at: now, rejection_reason: reason, bulk_action: true },
            })
            .eq("id", rewardInstanceId);

          await supabaseAdmin.from("notifications").insert({
            user_id: reward.user_id,
            type: "REWARD_REJECTED",
            title: "Bonus abgelehnt",
            message: reason || `Dein ${reward.reward_definitions?.title || "Bonus"} konnte leider nicht freigegeben werden.`,
            cta_url: "/dashboard/p2g-points",
            metadata: { reward_instance_id: rewardInstanceId, reason },
          });

          rejected++;
        } catch (err) {
          logStep("Error in bulk reject loop", { rewardInstanceId, error: String(err) });
        }
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "BULK_REWARD_REJECTED",
        target_type: "reward_instances",
        details: { count: rejected, reason, reward_instance_ids: rewardInstanceIds },
      });

      logStep("Bulk reject complete", { rejected });

      return new Response(JSON.stringify({ success: true, rejected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CREATE reward definition
    if (action === "create_definition") {
      const { key, title, description, category, points_rule, awarding_mode, approval_required, caps, expiry_days, display_rule_text } = body;

      if (!key || !title || !category) {
        throw new Error("key, title, and category required");
      }

      // Check unique key
      const { data: existing } = await supabaseAdmin
        .from("reward_definitions")
        .select("key")
        .eq("key", key)
        .single();

      if (existing) {
        throw new Error("Key already exists");
      }

      const { data: newDef, error } = await supabaseAdmin
        .from("reward_definitions")
        .insert({
          key,
          title,
          description: description || null,
          category,
          points_rule: points_rule || { type: "fixed", value: 0 },
          awarding_mode: awarding_mode || "USER_CLAIM",
          approval_required: approval_required || false,
          caps: caps || null,
          expiry_days: expiry_days || null,
          display_rule_text: display_rule_text || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REWARD_DEFINITION_CREATED",
        target_type: "reward_definition",
        target_id: key,
        details: { title, category, awarding_mode, approval_required },
      });

      logStep("Reward definition created", { key, title });

      return new Response(JSON.stringify({ success: true, definition: newDef }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // UPDATE reward definition
    if (action === "update_definition") {
      const { key, ...updates } = body;

      if (!key) {
        throw new Error("key required");
      }

      // Remove action from updates
      delete updates.action;

      const { data: updated, error } = await supabaseAdmin
        .from("reward_definitions")
        .update(updates)
        .eq("key", key)
        .select()
        .single();

      if (error) throw error;

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REWARD_DEFINITION_UPDATED",
        target_type: "reward_definition",
        target_id: key,
        details: updates,
      });

      logStep("Reward definition updated", { key });

      return new Response(JSON.stringify({ success: true, definition: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // REPAIR: Auto-claim PENDING booking rewards
    if (action === "repair_pending_rewards") {
      logStep("Starting repair of pending booking rewards");

      // Find all PENDING rewards from bookings where booking is confirmed
      const { data: pendingRewards, error: pendingError } = await supabaseAdmin
        .from("reward_instances")
        .select(`
          id,
          user_id,
          definition_key,
          points,
          source_id,
          source_type,
          metadata,
          reward_definitions(title, awarding_mode)
        `)
        .eq("status", "PENDING")
        .eq("source_type", "booking");

      if (pendingError) throw pendingError;

      if (!pendingRewards || pendingRewards.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          repaired: 0,
          total_points: 0,
          message: "Keine ausstehenden Buchungsrewards gefunden",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check which bookings are confirmed
      const sourceIds = pendingRewards.map(r => r.source_id);
      const { data: confirmedBookings } = await supabaseAdmin
        .from("bookings")
        .select("id, status")
        .in("id", sourceIds)
        .in("status", ["confirmed", "completed"]);

      const confirmedBookingIds = new Set(confirmedBookings?.map(b => b.id) || []);

      // Filter to only those with confirmed bookings and no approval required
      const rewardsToRepair = pendingRewards.filter(r => {
        const def = r.reward_definitions as { awarding_mode?: string } | null;
        return confirmedBookingIds.has(r.source_id) && def?.awarding_mode === "AUTO_CLAIM";
      });

      logStep("Rewards to repair", { count: rewardsToRepair.length });

      let repairedCount = 0;
      let totalPoints = 0;
      const now = new Date().toISOString();

      for (const reward of rewardsToRepair) {
        try {
          // Get current balance for this user
          const { data: currentLedger } = await supabaseAdmin
            .from("points_ledger")
            .select("delta_points")
            .eq("user_id", reward.user_id)
            .eq("credit_type", "REWARD");

          const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
          const newBalance = currentBalance + reward.points;

          // Update status to CLAIMED
          await supabaseAdmin
            .from("reward_instances")
            .update({
              status: "CLAIMED",
              available_at: now,
              claimed_at: now,
              metadata: { ...(reward.metadata as Record<string, unknown>), repaired_by: user.id, repaired_at: now },
            })
            .eq("id", reward.id);

          // Create ledger entry
          await supabaseAdmin.from("points_ledger").insert({
            user_id: reward.user_id,
            credit_type: "REWARD",
            delta_points: reward.points,
            balance_after: newBalance,
            entry_type: "REPAIR_CLAIM",
            description: (reward.reward_definitions as { title?: string })?.title || reward.definition_key,
            reward_instance_id: reward.id,
          });

          // Update wallet
          const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("reward_credits, lifetime_credits")
            .eq("user_id", reward.user_id)
            .maybeSingle();

          if (wallet) {
            await supabaseAdmin
              .from("wallets")
              .update({
                reward_credits: (wallet.reward_credits || 0) + reward.points,
                lifetime_credits: (wallet.lifetime_credits || 0) + reward.points,
              })
              .eq("user_id", reward.user_id);
          }

          // Create notification
          await supabaseAdmin.from("notifications").insert({
            user_id: reward.user_id,
            type: "REWARD_CREDITED",
            title: `${reward.points} Credits gutgeschrieben!`,
            message: `Dein Buchungsbonus wurde automatisch freigeschaltet.`,
            cta_url: "/dashboard/p2g-points",
            metadata: { reward_instance_id: reward.id, points: reward.points, repaired: true },
          });

          repairedCount++;
          totalPoints += reward.points;
        } catch (rewardError) {
          logStep("Error repairing reward", { rewardId: reward.id, error: rewardError });
        }
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REPAIR_PENDING_REWARDS",
        target_type: "reward_instance",
        target_id: null,
        details: { repaired_count: repairedCount, total_points: totalPoints },
      });

      logStep("Repair complete", { repairedCount, totalPoints });

      return new Response(JSON.stringify({
        success: true,
        repaired: repairedCount,
        total_points: totalPoints,
        message: `${repairedCount} Rewards repariert, ${totalPoints} Credits gutgeschrieben`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CREATE MULTI-PLAYER MATCH (4 players at once)
    if (action === "create_multi_player_match") {
      const { matchId, teamAWins, players } = body;

      if (!matchId || !players || !Array.isArray(players)) {
        throw new Error("matchId and players array required");
      }

      logStep("Creating multi-player match", { matchId, teamAWins, playerCount: players.length });

      // Get skill config
      const { data: config } = await supabaseAdmin
        .from("skill_credits_config")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      const baseMultiplier = config?.base_multiplier || 1.0;
      const maxCredits = config?.max_credits_per_match || 500;
      const roundingPolicy = config?.rounding_policy || "floor";
      const formulaVersion = config?.formula_version || 1;

      const now = new Date().toISOString();
      const results: Array<{ userId: string; result: string; credits: number }> = [];

      // Build metadata with all 4 players
      const matchPlayers = {
        team_a: {
          player_1: players.find((p: { position: string }) => p.position === "teamA_player1") || null,
          partner: players.find((p: { position: string }) => p.position === "teamA_partner") || null,
        },
        team_b: {
          opponent_1: players.find((p: { position: string }) => p.position === "teamB_opponent1") || null,
          opponent_2: players.find((p: { position: string }) => p.position === "teamB_opponent2") || null,
        },
      };

      for (const player of players) {
        // Skip disabled slots or guests
        if (!player.enabled || player.type === "guest" || !player.userId) {
          logStep("Skipping player", { type: player.type, enabled: player.enabled, hasUserId: !!player.userId });
          continue;
        }

        const isTeamA = player.team === "A";
        const isWinner = (isTeamA && teamAWins) || (!isTeamA && !teamAWins);
        const result = isWinner ? "W" : "L";

        // Check for existing analysis
        const { data: existing } = await supabaseAdmin
          .from("match_analyses")
          .select("id")
          .eq("match_id", matchId)
          .eq("user_id", player.userId)
          .maybeSingle();

        if (existing) {
          logStep("Match already exists for user", { matchId, userId: player.userId });
          continue;
        }

        // Calculate credits
        const score = player.score || 75;
        const skillLevel = player.skillLevel || 5;
        let rawCredits = skillLevel * score * baseMultiplier;
        rawCredits *= isWinner ? 1.2 : 0.8;

        let credits: number;
        switch (roundingPolicy) {
          case "ceil": credits = Math.ceil(rawCredits); break;
          case "round": credits = Math.round(rawCredits); break;
          default: credits = Math.floor(rawCredits);
        }
        credits = Math.min(credits, maxCredits);

        // Create match analysis
        const { data: analysis, error: analysisError } = await supabaseAdmin
          .from("match_analyses")
          .insert({
            match_id: matchId,
            user_id: player.userId,
            result,
            manual_score: score,
            skill_level_snapshot: skillLevel,
            formula_version: formulaVersion,
            credits_awarded: credits,
            status: "COMPLETED",
            analyzed_at: now,
            metadata: {
              created_by_admin: user.id,
              match_players: matchPlayers,
              team_a_wins: teamAWins,
              position: player.position,
              ai_data: player.aiData || null,
            },
          })
          .select()
          .single();

        if (analysisError) {
          logStep("Error creating analysis", { error: analysisError.message });
          continue;
        }

        // Get current skill balance
        const { data: currentLedger } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", player.userId)
          .eq("credit_type", "SKILL");

        const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

        // Create ledger entry
        await supabaseAdmin.from("points_ledger").insert({
          user_id: player.userId,
          credit_type: "SKILL",
          delta_points: credits,
          balance_after: currentBalance + credits,
          entry_type: "ADMIN_CREDIT",
          description: `Match ${matchId}`,
          source_type: "match_analysis",
          source_id: analysis.id,
        });

        // Update wallet
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("play_credits, lifetime_credits")
          .eq("user_id", player.userId)
          .maybeSingle();

        if (wallet) {
          await supabaseAdmin
            .from("wallets")
            .update({
              play_credits: (wallet.play_credits || 0) + credits,
              lifetime_credits: (wallet.lifetime_credits || 0) + credits,
              last_game_credits: credits,
              last_game_date: now,
            })
            .eq("user_id", player.userId);
        }

        // Create notification
        await supabaseAdmin.from("notifications").insert({
          user_id: player.userId,
          type: "SKILL_CREDITED",
          title: `${credits} Credits erhalten!`,
          message: `Du hast ${credits} Skill-Credits für dein Match erhalten (${result === "W" ? "Sieg" : "Niederlage"}).`,
          metadata: { match_id: matchId, credits, result },
          cta_url: "/dashboard/p2g-points",
        });

        results.push({ userId: player.userId, result, credits });
        logStep("Match analysis created", { userId: player.userId, credits, result });
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "MULTI_PLAYER_MATCH_CREATED",
        target_type: "match_analysis",
        target_id: matchId,
        details: { match_id: matchId, team_a_wins: teamAWins, created: results.length, results },
      });

      logStep("Multi-player match complete", { matchId, created: results.length });

      return new Response(JSON.stringify({
        success: true,
        created: results.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CREATE match analysis (Admin manual entry)
    if (action === "create_match_analysis") {
      const { 
        userId, 
        matchId, 
        score, 
        skillLevel, 
        result,
        partnerUserId,
        opponent1UserId,
        opponent2UserId,
        metadata: aiMetadata 
      } = body;

      if (!userId || !matchId || score === undefined) {
        throw new Error("userId, matchId, and score required");
      }

      // Get skill config
      const { data: config } = await supabaseAdmin
        .from("skill_credits_config")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      const baseMultiplier = config?.base_multiplier || 1.0;
      const maxCredits = config?.max_credits_per_match || 500;
      const roundingPolicy = config?.rounding_policy || "floor";
      const formulaVersion = config?.formula_version || 1;

      // Get user's current skill level if not provided
      let userSkillLevel = skillLevel;
      if (userSkillLevel === undefined) {
        const { data: skillStats } = await supabaseAdmin
          .from("skill_stats")
          .select("skill_level")
          .eq("user_id", userId)
          .maybeSingle();
        userSkillLevel = skillStats?.skill_level || 5;
      }

      // Calculate credits: skill_level * score * multiplier
      let rawCredits = userSkillLevel * score * baseMultiplier;
      
      let credits: number;
      switch (roundingPolicy) {
        case "ceil": credits = Math.ceil(rawCredits); break;
        case "round": credits = Math.round(rawCredits); break;
        default: credits = Math.floor(rawCredits);
      }
      credits = Math.min(credits, maxCredits);

      // Check for existing analysis
      const { data: existingAnalysis } = await supabaseAdmin
        .from("match_analyses")
        .select("id")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingAnalysis) {
        throw new Error("Match already exists for this user");
      }

      const now = new Date().toISOString();

      // Build metadata combining admin info, AI analysis data, and player info
      const finalMetadata = {
        created_by_admin: user.id,
        base_multiplier: baseMultiplier,
        partner_user_id: partnerUserId || null,
        opponent_1_user_id: opponent1UserId || null,
        opponent_2_user_id: opponent2UserId || null,
        ...(aiMetadata || {}),
      };

      // Create match analysis record
      const { data: analysis, error: analysisError } = await supabaseAdmin
        .from("match_analyses")
        .insert({
          match_id: matchId,
          user_id: userId,
          result: result || null,
          opponent_user_id: opponent1UserId || null,
          manual_score: score,
          skill_level_snapshot: userSkillLevel,
          formula_version: formulaVersion,
          credits_awarded: credits,
          status: "COMPLETED",
          analyzed_at: now,
          metadata: finalMetadata,
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      // Get current skill balance
      const { data: currentLedger } = await supabaseAdmin
        .from("points_ledger")
        .select("delta_points")
        .eq("user_id", userId)
        .eq("credit_type", "SKILL");

      const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

      // Create ledger entry
      await supabaseAdmin.from("points_ledger").insert({
        user_id: userId,
        credit_type: "SKILL",
        delta_points: credits,
        balance_after: currentBalance + credits,
        entry_type: "ADMIN_CREDIT",
        description: `Admin-Match ${matchId}`,
        source_type: "match_analysis",
        source_id: analysis.id,
      });

      // Update wallet
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("play_credits, lifetime_credits, last_game_credits, last_game_date")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        await supabaseAdmin
          .from("wallets")
          .update({
            play_credits: (wallet.play_credits || 0) + credits,
            lifetime_credits: (wallet.lifetime_credits || 0) + credits,
            last_game_credits: credits,
            last_game_date: now,
          })
          .eq("user_id", userId);
      }

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "SKILL_CREDITED",
        title: "Skill-Credits erhalten!",
        message: `Du hast ${credits} Skill-Credits für dein Match erhalten.`,
        metadata: { match_id: matchId, credits, analysis_id: analysis.id },
        cta_url: "/dashboard/p2g-points",
      });

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "MATCH_ANALYSIS_CREATED",
        target_type: "match_analysis",
        target_id: analysis.id,
        details: { user_id: userId, match_id: matchId, score, skill_level: userSkillLevel, credits },
      });

      // Calculate new skill level as average of last 5 matches
      const { data: recentMatches } = await supabaseAdmin
        .from("match_analyses")
        .select("skill_level_snapshot")
        .eq("user_id", userId)
        .eq("status", "COMPLETED")
        .order("analyzed_at", { ascending: false })
        .limit(5);

      if (recentMatches && recentMatches.length > 0) {
        const avgSkillLevel = recentMatches.reduce((sum, m) => sum + (m.skill_level_snapshot || 0), 0) / recentMatches.length;
        const roundedSkillLevel = Math.round(avgSkillLevel * 10) / 10; // Round to 1 decimal

        // Upsert skill_stats for this user
        const { data: existingStats } = await supabaseAdmin
          .from("skill_stats")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingStats) {
          await supabaseAdmin
            .from("skill_stats")
            .update({ skill_level: roundedSkillLevel, last_ai_update: now })
            .eq("user_id", userId);
        } else {
          await supabaseAdmin
            .from("skill_stats")
            .insert({ user_id: userId, skill_level: roundedSkillLevel, last_ai_update: now });
        }

        logStep("Updated skill_level", { userId, avgSkillLevel: roundedSkillLevel, matchCount: recentMatches.length });
      }

      logStep("Match analysis created by admin", { matchId, userId, credits });

      return new Response(JSON.stringify({
        success: true,
        analysis,
        credits_awarded: credits,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // LIST match analyses for admin
    if (action === "list_match_analyses") {
      const { userId, limit = 50 } = body;

      let query = supabaseAdmin
        .from("match_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data: analyses, error } = await query;
      if (error) throw error;

      // Get profiles for display names
      const userIds = [...new Set(analyses?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedAnalyses = analyses?.map(a => ({
        ...a,
        profile: profilesMap.get(a.user_id) || null,
      }));

      return new Response(JSON.stringify({ analyses: enrichedAnalyses }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // RESET all skill credits (yearly reset)
    if (action === "reset_all_skill_credits") {
      logStep("Starting yearly skill credits reset");

      // Get all wallets with lifetime credits > 0 OR play_credits > 0
      const { data: wallets, error: walletsError } = await supabaseAdmin
        .from("wallets")
        .select("user_id, lifetime_credits, play_credits")
        .or("lifetime_credits.gt.0,play_credits.gt.0");

      if (walletsError) throw walletsError;

      const affectedUsers: string[] = [];
      const now = new Date().toISOString();

      for (const wallet of wallets || []) {
        const userId = wallet.user_id;
        const currentLifetime = wallet.lifetime_credits || 0;
        const currentPlayCredits = wallet.play_credits || 0;

        if (currentLifetime <= 0 && currentPlayCredits <= 0) continue;

        // Get current skill balance from ledger
        const { data: ledgerEntries } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", userId)
          .eq("credit_type", "SKILL");

        const currentSkillBalance = ledgerEntries?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

        // Create negative ledger entry to reset skill balance
        if (currentSkillBalance > 0) {
          await supabaseAdmin.from("points_ledger").insert({
            user_id: userId,
            credit_type: "SKILL",
            delta_points: -currentSkillBalance,
            balance_after: 0,
            entry_type: "ADMIN_RESET",
            description: "Jährlicher Reset der Skill-Credits",
          });
        }

        // Reset wallet play_credits AND lifetime_credits to 0 (BUG FIX: play_credits was missing)
        await supabaseAdmin
          .from("wallets")
          .update({
            play_credits: 0,
            lifetime_credits: 0,
            updated_at: now,
          })
          .eq("user_id", userId);

        // Reset skill_level to 0
        await supabaseAdmin
          .from("skill_stats")
          .update({ skill_level: 0, last_ai_update: now })
          .eq("user_id", userId);

        // Create notification for user
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "SKILL_RESET",
          title: "Jährlicher Reset",
          message: `Deine ${currentLifetime} Skill-Credits und ${currentPlayCredits} Play-Credits wurden für die neue Saison zurückgesetzt.`,
          cta_url: "/dashboard/league",
          metadata: { previous_lifetime: currentLifetime, previous_play: currentPlayCredits, reset_by: user.id },
        });

        affectedUsers.push(userId);
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "YEARLY_SKILL_RESET",
        target_type: "wallets",
        target_id: null,
        details: { affected_users: affectedUsers.length, reset_at: now },
      });

      logStep("Yearly skill credits reset complete", { affectedUsers: affectedUsers.length });

      return new Response(JSON.stringify({
        success: true,
        affected_users: affectedUsers.length,
        message: `${affectedUsers.length} Benutzer wurden zurückgesetzt.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // RESET ALL CREDITS (global reset - all credit types)
    if (action === "reset_all_credits") {
      logStep("Starting GLOBAL credits reset (all credit types)");

      // Get all wallets with any credits > 0
      const { data: wallets, error: walletsError } = await supabaseAdmin
        .from("wallets")
        .select("user_id, reward_credits, play_credits, lifetime_credits")
        .or("reward_credits.gt.0,play_credits.gt.0,lifetime_credits.gt.0");

      if (walletsError) throw walletsError;

      const affectedUsers: string[] = [];
      const now = new Date().toISOString();

      for (const wallet of wallets || []) {
        const userId = wallet.user_id;
        const currentReward = wallet.reward_credits || 0;
        const currentPlay = wallet.play_credits || 0;
        const currentLifetime = wallet.lifetime_credits || 0;

        if (currentReward <= 0 && currentPlay <= 0 && currentLifetime <= 0) continue;

        // Get current REWARD balance from ledger
        const { data: rewardLedger } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", userId)
          .eq("credit_type", "REWARD");

        const currentRewardBalance = rewardLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

        // Create negative ledger entry to reset REWARD balance
        if (currentRewardBalance > 0) {
          await supabaseAdmin.from("points_ledger").insert({
            user_id: userId,
            credit_type: "REWARD",
            delta_points: -currentRewardBalance,
            balance_after: 0,
            entry_type: "ADMIN_RESET",
            description: "Globaler Reset aller Credits",
          });
        }

        // Get current SKILL balance from ledger
        const { data: skillLedger } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", userId)
          .eq("credit_type", "SKILL");

        const currentSkillBalance = skillLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

        // Create negative ledger entry to reset SKILL balance
        if (currentSkillBalance > 0) {
          await supabaseAdmin.from("points_ledger").insert({
            user_id: userId,
            credit_type: "SKILL",
            delta_points: -currentSkillBalance,
            balance_after: 0,
            entry_type: "ADMIN_RESET",
            description: "Globaler Reset aller Credits",
          });
        }

        // Reset ALL wallet credits to 0
        await supabaseAdmin
          .from("wallets")
          .update({
            reward_credits: 0,
            play_credits: 0,
            lifetime_credits: 0,
            last_game_credits: null,
            last_game_date: null,
            updated_at: now,
          })
          .eq("user_id", userId);

        // Reset skill_level to 0
        await supabaseAdmin
          .from("skill_stats")
          .update({ skill_level: 0, ai_rank: null, last_ai_update: now })
          .eq("user_id", userId);

        // Create notification for user
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "GLOBAL_RESET",
          title: "Credits zurückgesetzt",
          message: `Alle deine Credits wurden zurückgesetzt: ${currentReward} Reward, ${currentPlay} Play, ${currentLifetime} Lifetime.`,
          cta_url: "/dashboard/p2g-points",
          metadata: { 
            previous_reward: currentReward, 
            previous_play: currentPlay, 
            previous_lifetime: currentLifetime,
            reset_by: user.id 
          },
        });

        affectedUsers.push(userId);
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "GLOBAL_CREDITS_RESET",
        target_type: "wallets",
        target_id: null,
        details: { affected_users: affectedUsers.length, reset_at: now },
      });

      logStep("GLOBAL credits reset complete", { affectedUsers: affectedUsers.length });

      return new Response(JSON.stringify({
        success: true,
        affected_users: affectedUsers.length,
        message: `Alle Credits von ${affectedUsers.length} Benutzern wurden zurückgesetzt.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // RESET all reward credits only (keeps lifetime and play credits)
    if (action === "reset_all_reward_credits") {
      logStep("Starting reward credits reset");

      const { data: wallets, error: walletsError } = await supabaseAdmin
        .from("wallets")
        .select("user_id, reward_credits")
        .gt("reward_credits", 0);

      if (walletsError) throw walletsError;

      const affectedUsers: string[] = [];
      const now = new Date().toISOString();

      for (const wallet of wallets || []) {
        const userId = wallet.user_id;
        const currentReward = wallet.reward_credits || 0;

        if (currentReward <= 0) continue;

        // Get current reward balance from ledger
        const { data: ledgerEntries } = await supabaseAdmin
          .from("points_ledger")
          .select("delta_points")
          .eq("user_id", userId)
          .eq("credit_type", "REWARD");

        const currentBalance = ledgerEntries?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;

        // Create negative ledger entry to reset reward balance
        if (currentBalance > 0) {
          await supabaseAdmin.from("points_ledger").insert({
            user_id: userId,
            credit_type: "REWARD",
            delta_points: -currentBalance,
            balance_after: 0,
            entry_type: "ADMIN_RESET",
            description: "Reward-Credits Reset",
          });
        }

        // Reset wallet reward_credits to 0
        await supabaseAdmin
          .from("wallets")
          .update({
            reward_credits: 0,
            updated_at: now,
          })
          .eq("user_id", userId);

        // Create notification
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "REWARD_RESET",
          title: "Reward-Credits zurückgesetzt",
          message: `Deine ${currentReward} Reward-Credits wurden zurückgesetzt.`,
          cta_url: "/dashboard/p2g-points",
          metadata: { previous_reward: currentReward, reset_by: user.id },
        });

        affectedUsers.push(userId);
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "REWARD_CREDITS_RESET",
        target_type: "wallets",
        target_id: null,
        details: { affected_users: affectedUsers.length, reset_at: now },
      });

      logStep("Reward credits reset complete", { affectedUsers: affectedUsers.length });

      return new Response(JSON.stringify({
        success: true,
        affected_users: affectedUsers.length,
        message: `${affectedUsers.length} Benutzer wurden zurückgesetzt.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // RESET all bookings (with optional filter for only expired/cancelled)
    if (action === "reset_all_bookings") {
      const { onlyExpiredAndCancelled } = body;
      logStep("Starting bookings reset", { onlyExpiredAndCancelled });

      // Get bookings to delete
      let bookingsQuery = supabaseAdmin.from("bookings").select("id, status");
      
      if (onlyExpiredAndCancelled) {
        bookingsQuery = bookingsQuery.in("status", ["cancelled", "expired"]);
      }

      const { data: bookingsToDelete, error: bookingsQueryError } = await bookingsQuery;
      if (bookingsQueryError) throw bookingsQueryError;

      const bookingIds = bookingsToDelete?.map(b => b.id) || [];
      
      if (bookingIds.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          deleted_bookings: 0,
          deleted_participants: 0,
          deleted_players: 0,
          deleted_payments: 0,
          message: "Keine Buchungen zum Löschen gefunden.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Deleting bookings", { count: bookingIds.length });

      // 1. Delete booking_participants (FK constraint)
      const { data: deletedParticipants, error: participantsError } = await supabaseAdmin
        .from("booking_participants")
        .delete()
        .in("booking_id", bookingIds)
        .select("id");
      
      if (participantsError) {
        logStep("Error deleting participants", { error: participantsError.message });
        throw participantsError;
      }

      // 2. Delete booking_players (FK constraint)
      const { data: deletedPlayers, error: playersError } = await supabaseAdmin
        .from("booking_players")
        .delete()
        .in("booking_id", bookingIds)
        .select("id");
      
      if (playersError) {
        logStep("Error deleting players", { error: playersError.message });
        throw playersError;
      }

      // 3. Delete payments (FK constraint)
      const { data: deletedPayments, error: paymentsError } = await supabaseAdmin
        .from("payments")
        .delete()
        .in("booking_id", bookingIds)
        .select("id");
      
      if (paymentsError) {
        logStep("Error deleting payments", { error: paymentsError.message });
        throw paymentsError;
      }

      // 4. Delete bookings
      const { error: bookingsError } = await supabaseAdmin
        .from("bookings")
        .delete()
        .in("id", bookingIds);
      
      if (bookingsError) {
        logStep("Error deleting bookings", { error: bookingsError.message });
        throw bookingsError;
      }

      const now = new Date().toISOString();

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "BOOKINGS_RESET",
        target_type: "bookings",
        target_id: null,
        details: {
          deleted_bookings: bookingIds.length,
          deleted_participants: deletedParticipants?.length || 0,
          deleted_players: deletedPlayers?.length || 0,
          deleted_payments: deletedPayments?.length || 0,
          only_expired_and_cancelled: onlyExpiredAndCancelled || false,
          reset_at: now,
        },
      });

      logStep("Bookings reset complete", {
        deleted_bookings: bookingIds.length,
        deleted_participants: deletedParticipants?.length || 0,
        deleted_players: deletedPlayers?.length || 0,
        deleted_payments: deletedPayments?.length || 0,
      });

      return new Response(JSON.stringify({
        success: true,
        deleted_bookings: bookingIds.length,
        deleted_participants: deletedParticipants?.length || 0,
        deleted_players: deletedPlayers?.length || 0,
        deleted_payments: deletedPayments?.length || 0,
        message: `${bookingIds.length} Buchungen wurden gelöscht.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // DELETE user completely
    if (action === "delete_user") {
      const { userId, confirmPhrase } = body;
      
      if (!userId) throw new Error("userId required");
      if (confirmPhrase !== "DELETE") throw new Error("Confirmation phrase 'DELETE' required");

      logStep("Deleting user", { userId, adminId: user.id });

      // Delete in order due to foreign key constraints
      // 1. notifications
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", userId);
      if (notifError) logStep("Warning: notifications delete", { error: notifError.message });

      // 2. points_ledger
      const { error: ledgerError } = await supabaseAdmin
        .from("points_ledger")
        .delete()
        .eq("user_id", userId);
      if (ledgerError) logStep("Warning: points_ledger delete", { error: ledgerError.message });

      // 3. reward_instances
      const { error: rewardInstError } = await supabaseAdmin
        .from("reward_instances")
        .delete()
        .eq("user_id", userId);
      if (rewardInstError) logStep("Warning: reward_instances delete", { error: rewardInstError.message });

      // 4. marketplace_redemptions
      const { error: redemptionsError } = await supabaseAdmin
        .from("marketplace_redemptions")
        .delete()
        .eq("user_id", userId);
      if (redemptionsError) logStep("Warning: marketplace_redemptions delete", { error: redemptionsError.message });

      // 5. daily_claims
      const { error: claimsError } = await supabaseAdmin
        .from("daily_claims")
        .delete()
        .eq("user_id", userId);
      if (claimsError) logStep("Warning: daily_claims delete", { error: claimsError.message });

      // 6. user_streaks
      const { error: streaksError } = await supabaseAdmin
        .from("user_streaks")
        .delete()
        .eq("user_id", userId);
      if (streaksError) logStep("Warning: user_streaks delete", { error: streaksError.message });

      // 7. match_analyses
      const { error: matchError } = await supabaseAdmin
        .from("match_analyses")
        .delete()
        .eq("user_id", userId);
      if (matchError) logStep("Warning: match_analyses delete", { error: matchError.message });

      // 8. Get bookings for this user to delete related data
      const { data: userBookings } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("user_id", userId);
      
      const bookingIds = userBookings?.map(b => b.id) || [];
      
      if (bookingIds.length > 0) {
        // 8a. booking_participants
        const { error: participantsError } = await supabaseAdmin
          .from("booking_participants")
          .delete()
          .in("booking_id", bookingIds);
        if (participantsError) logStep("Warning: booking_participants delete", { error: participantsError.message });

        // 8b. booking_players
        const { error: playersError } = await supabaseAdmin
          .from("booking_players")
          .delete()
          .in("booking_id", bookingIds);
        if (playersError) logStep("Warning: booking_players delete", { error: playersError.message });

        // 8c. payments
        const { error: paymentsError } = await supabaseAdmin
          .from("payments")
          .delete()
          .in("booking_id", bookingIds);
        if (paymentsError) logStep("Warning: payments delete", { error: paymentsError.message });
      }

      // Also delete participant invites where user was invited
      const { error: invitedParticipantsError } = await supabaseAdmin
        .from("booking_participants")
        .delete()
        .eq("invited_user_id", userId);
      if (invitedParticipantsError) logStep("Warning: invited booking_participants delete", { error: invitedParticipantsError.message });

      // 9. bookings
      const { error: bookingsError } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("user_id", userId);
      if (bookingsError) logStep("Warning: bookings delete", { error: bookingsError.message });

      // 10. skill_stats
      const { error: skillStatsError } = await supabaseAdmin
        .from("skill_stats")
        .delete()
        .eq("user_id", userId);
      if (skillStatsError) logStep("Warning: skill_stats delete", { error: skillStatsError.message });

      // 11. wallets
      const { error: walletsError } = await supabaseAdmin
        .from("wallets")
        .delete()
        .eq("user_id", userId);
      if (walletsError) logStep("Warning: wallets delete", { error: walletsError.message });

      // 12. user_roles
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (rolesError) logStep("Warning: user_roles delete", { error: rolesError.message });

      // 13. referral_attributions (both as referrer and referred)
      const { error: referralError1 } = await supabaseAdmin
        .from("referral_attributions")
        .delete()
        .eq("referrer_user_id", userId);
      if (referralError1) logStep("Warning: referral_attributions (referrer) delete", { error: referralError1.message });

      const { error: referralError2 } = await supabaseAdmin
        .from("referral_attributions")
        .delete()
        .eq("referred_user_id", userId);
      if (referralError2) logStep("Warning: referral_attributions (referred) delete", { error: referralError2.message });

      // 14. ai_player_analytics
      const { error: aiAnalyticsError } = await supabaseAdmin
        .from("ai_player_analytics")
        .delete()
        .eq("user_id", userId);
      if (aiAnalyticsError) logStep("Warning: ai_player_analytics delete", { error: aiAnalyticsError.message });

      // 15. ai_visual_assets
      const { error: aiAssetsError } = await supabaseAdmin
        .from("ai_visual_assets")
        .delete()
        .eq("user_id", userId);
      if (aiAssetsError) logStep("Warning: ai_visual_assets delete", { error: aiAssetsError.message });

      // 16. profiles
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", userId);
      if (profileError) logStep("Warning: profiles delete", { error: profileError.message });

      // 17. Delete from auth.users
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        logStep("Error deleting auth user", { error: authDeleteError.message });
        throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
      }

      // Log admin activity
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: user.id,
        action: "USER_DELETED",
        target_type: "user",
        target_id: userId,
        details: {
          deleted_bookings: bookingIds.length,
          deleted_at: new Date().toISOString(),
        },
      });

      logStep("User deleted successfully", { userId });

      return new Response(JSON.stringify({ success: true, deletedUserId: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: message === "Unauthorized" || message === "Admin access required" ? 403 : 400,
    });
  }
});
