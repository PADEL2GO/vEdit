import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Use service role client for cleanup operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Running cleanup for expired notifications");

    // Call the cleanup function
    const { data, error } = await supabase.rpc("cleanup_expired_notifications");

    if (error) {
      console.error("Error cleaning up expired notifications:", error);
      throw error;
    }

    console.log(`Cleanup complete, affected rows: ${data}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        affected_rows: data,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in cleanup-expired-notifications:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
