import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ valid: false, reason: "Nicht authentifiziert" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ valid: false, reason: "Nicht authentifiziert" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return new Response(JSON.stringify({ valid: false, reason: "Kein Code angegeben" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Look up voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from("voucher_codes")
      .select("*")
      .eq("code", normalizedCode)
      .single();

    if (voucherError || !voucher) {
      return new Response(JSON.stringify({ valid: false, reason: "Ungültiger Code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check active
    if (!voucher.is_active) {
      return new Response(JSON.stringify({ valid: false, reason: "Dieser Code ist nicht mehr aktiv" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check valid_from
    const now = new Date();
    if (new Date(voucher.valid_from) > now) {
      return new Response(JSON.stringify({ valid: false, reason: "Dieser Code ist noch nicht gültig" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check valid_until
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return new Response(JSON.stringify({ valid: false, reason: "Dieser Code ist abgelaufen" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max_uses
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return new Response(JSON.stringify({ valid: false, reason: "Dieser Code wurde bereits vollständig eingelöst" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a human-readable discount label for the checkout UI
    let discount_label = "Kostenlos";
    const dt: string = voucher.discount_type ?? "free";
    const dv: number = voucher.discount_value ?? 0;
    if (dt === "percentage" && dv < 100) {
      discount_label = `${dv} % Rabatt`;
    } else if (dt === "fixed" && dv > 0) {
      const euros = (dv / 100).toFixed(2).replace(".", ",");
      discount_label = `${euros} € Rabatt`;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        voucher_id: voucher.id,
        description: voucher.description,
        discount_type: dt,
        discount_value: dv,
        discount_label,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("voucher-validate error:", err);
    return new Response(JSON.stringify({ valid: false, reason: "Serverfehler" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
