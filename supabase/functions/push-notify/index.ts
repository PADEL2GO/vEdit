import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Sends a push to all of a user's devices via the Expo Push API. Invoked server-side only
// (DB trigger on `notifications` inserts — see the device_tokens migration). Auth mirrors
// send-match-reminders: dedicated CRON_SECRET (preferred) or the service-role key.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const authorized =
    (cronSecret.length > 0 && authHeader === `Bearer ${cronSecret}`) ||
    (serviceKey.length > 0 && authHeader === `Bearer ${serviceKey}`);
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) return json({ error: "Missing user_id or title" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", user_id);
    if (error) return json({ error: error.message }, 500);
    if (!tokens?.length) return json({ sent: 0 }, 200);

    // Expo accepts up to 100 messages per request.
    const messages = tokens.map((t) => ({
      to: t.token,
      title,
      body: body ?? "",
      data: data ?? {},
      sound: "default",
    }));
    const stale: string[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      const result = await res.json().catch(() => null);
      // Prune tokens Expo reports as dead so we stop pushing to uninstalled devices.
      const tickets: Array<{ status: string; details?: { error?: string } }> = result?.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          stale.push(chunk[idx].to);
        }
      });
    }
    if (stale.length) {
      await supabase.from("device_tokens").delete().in("token", stale);
    }

    return json({ sent: messages.length - stale.length, pruned: stale.length }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
