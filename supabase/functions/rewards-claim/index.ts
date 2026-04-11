import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[rewards-claim] ${step}`, details ? JSON.stringify(details) : "");
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

    const { rewardInstanceId } = await req.json();
    logStep("Claim request", { userId: user.id, rewardInstanceId });

    if (!rewardInstanceId) {
      throw new Error("rewardInstanceId required");
    }

    // Get the reward instance
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("reward_instances")
      .select("*")
      .eq("id", rewardInstanceId)
      .eq("user_id", user.id)
      .single();

    if (instanceError || !instance) {
      throw new Error("Reward not found");
    }

    // Check if already claimed or not available
    if (instance.status !== "AVAILABLE") {
      throw new Error(`Reward cannot be claimed. Status: ${instance.status}`);
    }

    // Check expiry
    if (instance.expires_at && new Date(instance.expires_at) < new Date()) {
      await supabaseAdmin
        .from("reward_instances")
        .update({ status: "EXPIRED" })
        .eq("id", instance.id);
      throw new Error("Reward has expired");
    }

    // Get current balance
    const { data: currentBalance } = await supabaseAdmin.rpc("get_user_rewards_balance", {
      p_user_id: user.id,
    });
    const newBalance = (currentBalance || 0) + instance.points;

    // ATOMIC TRANSACTION: Update instance and create ledger entry
    // 1. Update reward instance to CLAIMED — the .eq("status", "AVAILABLE") acts as a mutex.
    //    If a concurrent request already claimed this, the update matches 0 rows.
    const { data: updatedInstance, error: updateError } = await supabaseAdmin
      .from("reward_instances")
      .update({
        status: "CLAIMED",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .eq("status", "AVAILABLE") // Only succeeds if still AVAILABLE
      .select("id");

    if (updateError) {
      throw new Error("Failed to claim reward");
    }

    if (!updatedInstance || updatedInstance.length === 0) {
      // Another concurrent request already claimed this reward
      throw new Error("Reward already claimed");
    }

    // 2. Create ledger entry
    const { error: ledgerError } = await supabaseAdmin
      .from("points_ledger")
      .insert({
        user_id: user.id,
        reward_instance_id: instance.id,
        delta_points: instance.points,
        entry_type: "EARN_CLAIM",
        balance_after: newBalance,
        description: `Claimed: ${instance.definition_key}`,
      });

    if (ledgerError) {
      // Rollback the instance status
      await supabaseAdmin
        .from("reward_instances")
        .update({ status: "AVAILABLE", claimed_at: null })
        .eq("id", instance.id);
      throw new Error("Failed to record points");
    }

    // 3. Update wallets table for sync (reward_credits AND lifetime_credits)
    // First get current lifetime_credits
    const { data: walletData } = await supabaseAdmin
      .from("wallets")
      .select("lifetime_credits")
      .eq("user_id", user.id)
      .single();
    
    const currentLifetime = walletData?.lifetime_credits || 0;
    
    await supabaseAdmin
      .from("wallets")
      .update({ 
        reward_credits: newBalance,
        lifetime_credits: currentLifetime + instance.points,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    // 4. Create notification
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "REWARD_CLAIMED",
      title: "Credits gutgeschrieben!",
      message: `+${instance.points} Credits wurden deinem Konto gutgeschrieben.`,
      cta_url: "/app/rewards",
      metadata: { reward_instance_id: instance.id, points: instance.points, new_balance: newBalance },
    });

    logStep("Claim successful", { instanceId: instance.id, points: instance.points, newBalance });

    return new Response(JSON.stringify({
      success: true,
      points: instance.points,
      newBalance,
      rewardInstance: { ...instance, status: "CLAIMED", claimed_at: new Date().toISOString() },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: message === "Unauthorized" ? 401 : 400,
    });
  }
});
