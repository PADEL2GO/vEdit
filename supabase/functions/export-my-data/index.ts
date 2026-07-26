import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Self-service data export (Art. 15/20 DSGVO): returns the calling user's data
// as a JSON document. Read-only; a user can only ever export themselves.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const uid = user.id;
    const pick = async (table: string, column = "user_id") => {
      const { data, error } = await admin.from(table).select("*").eq(column, uid);
      if (error) {
        console.error(`export-my-data: ${table} failed:`, error.message);
        return [];
      }
      return data ?? [];
    };

    const [
      profile,
      wallet,
      ledger,
      bookings,
      orders,
      returns,
      receipts,
      deviceTokens,
      rewardInstances,
    ] = await Promise.all([
      pick("profiles"),
      pick("wallets"),
      pick("points_ledger"),
      pick("bookings"),
      pick("marketplace_redemptions"),
      pick("marketplace_returns"),
      pick("receipts"),
      pick("device_tokens"),
      pick("reward_instances"),
    ]);

    const exportDoc = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: uid,
        email: user.email,
        format: "PADEL2GO data export (Art. 15/20 DSGVO)",
      },
      account: { email: user.email, created_at: user.created_at, metadata: user.user_metadata },
      profile,
      wallet,
      points_ledger: ledger,
      bookings,
      marketplace_orders: orders,
      marketplace_returns: returns,
      receipts,
      device_tokens: deviceTokens,
      reward_instances: rewardInstances,
    };

    return json(exportDoc, 200);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
