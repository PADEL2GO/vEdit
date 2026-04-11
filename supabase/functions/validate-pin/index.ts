import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PINs stored server-side only — never shipped to the client bundle
const VALID_PINS: Record<string, string[]> = {
  vereine: ["P2G-V25", "VEREIN2025"],
  partner: ["P2G-P25", "PARTNER2025"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin, pageKey } = await req.json();

    if (!pin || !pageKey) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing pin or pageKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["vereine", "partner"].includes(pageKey)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid pageKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validPins = VALID_PINS[pageKey] || [];
    const isValid = validPins.includes(pin.toUpperCase().trim());

    return new Response(
      JSON.stringify({ valid: isValid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
