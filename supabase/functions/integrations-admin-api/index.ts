import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPERADMIN_EMAILS = ["fsteinfelder@padel2go.eu"];

/** Mask a secret: show first 6 chars + bullets + last 4 chars */
function mask(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 10) return "••••••••••••";
  return value.slice(0, 6) + "••••••••••••" + value.slice(-4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl   = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey       = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // --- Auth check ---
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin = SUPERADMIN_EMAILS.includes(user.email ?? "");
    if (!isSuperAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (roleData?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- GET: return masked config ---
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("site_integration_configs")
        .select("service, config, updated_at");

      if (error) throw error;

      // Return masked versions of secret fields
      const masked = (data ?? []).map((row) => {
        const c = row.config as Record<string, string>;
        const result: Record<string, string | boolean> = {};

        if (row.service === "stripe") {
          result.secret_key      = mask(c.secret_key);
          result.webhook_secret  = mask(c.webhook_secret);
          result.publishable_key = c.publishable_key ?? "";  // public key — not masked
          result.mode            = c.mode ?? "test";
          result.has_secret_key      = !!c.secret_key;
          result.has_webhook_secret  = !!c.webhook_secret;
        }
        if (row.service === "resend") {
          result.api_key    = mask(c.api_key);
          result.from_email = c.from_email ?? "";
          result.has_api_key = !!c.api_key;
        }
        if (row.service === "app") {
          result.url = c.url ?? "";
        }
        if (row.service === "paypal") {
          result.client_id     = mask(c.client_id);
          result.client_secret = mask(c.client_secret);
          result.mode          = c.mode ?? "sandbox";
          result.has_client_id     = !!c.client_id;
          result.has_client_secret = !!c.client_secret;
        }

        return { service: row.service, config: result, updated_at: row.updated_at };
      });

      return new Response(JSON.stringify({ data: masked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- POST: save config ---
    if (req.method === "POST") {
      const { service, config: newConfig } = await req.json();

      if (!service || !newConfig) {
        return new Response(JSON.stringify({ error: "service and config are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch existing config so we only overwrite provided fields
      // (don't wipe secret_key if the admin only updated from_email, etc.)
      const { data: existing } = await supabaseAdmin
        .from("site_integration_configs")
        .select("config")
        .eq("service", service)
        .single();

      const currentConfig = (existing?.config as Record<string, string>) ?? {};

      // Merge: skip empty strings (admin left field blank = keep existing value)
      const merged: Record<string, string> = { ...currentConfig };
      for (const [k, v] of Object.entries(newConfig as Record<string, string>)) {
        if (v !== "" && v !== null && v !== undefined) {
          merged[k] = v;
        }
      }

      const { error: upsertError } = await supabaseAdmin
        .from("site_integration_configs")
        .upsert({
          service,
          config: merged,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        });

      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[INTEGRATIONS-ADMIN-API] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
