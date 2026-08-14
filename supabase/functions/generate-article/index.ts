import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { stripUnsafeHtml } from "../_shared/stripUnsafeHtml.ts";
import { hasAdminAccess } from "../_shared/adminAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[generate-article] ${step}`, details ? JSON.stringify(details) : "");
};

const SYSTEM_PROMPT = `Du bist Redakteur:in für das padel2go News-Portal — eine Plattform für die deutsche Padel-Community.
Verwandle die diktierten Notizen in einen veröffentlichbaren, kompakten News-Artikel und übergib das Ergebnis
über das bereitgestellte Tool draft_article.

Regeln:
- title: prägnant, max. 80 Zeichen, kein Punkt am Ende
- excerpt: 1–2 Sätze als Anreißer für die Artikelkarte
- body_html: einfaches semantisches HTML — erlaubt sind <p>, <h3>, <ul>, <li>, <strong>, <em>;
  KEIN <script>, KEIN inline-Style, KEINE Class-Attribute
- Ton: sachlich, freundlich, deutsch (Du-Form ist okay)
- Behalte alle Fakten aus den Notizen bei; erfinde keine Daten, Zahlen oder Namen
- Wenn die Notizen sehr kurz oder unklar sind, erstelle trotzdem einen sinnvollen Artikel und halte ihn entsprechend kurz`;

const TOOL_DEFINITION = {
  name: "draft_article",
  description: "Schreibt einen veröffentlichungsfertigen News-Artikel-Entwurf aus diktierten Notizen.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Prägnante Schlagzeile, max. 80 Zeichen" },
      excerpt: { type: "string", description: "1–2 Sätze als Anreißer für die Artikelkarte" },
      body_html: {
        type: "string",
        description: "Artikelinhalt als einfaches semantisches HTML (<p>, <h3>, <ul>, <li>, <strong>, <em>)",
      },
    },
    required: ["title", "body_html"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Admin role check (user_roles row OR superadmin email bypass)
    if (!(await hasAdminAccess(supabaseAdmin, user, "news"))) {
      throw new Error("Admin access required");
    }

    // 3. Parse transcript
    const body = await req.json().catch(() => ({}));
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (transcript.length < 10) {
      return new Response(
        JSON.stringify({ error: "Transkript zu kurz — bitte etwas mehr einsprechen oder eingeben." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Resolve Anthropic API key — env first, DB fallback
    let anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      const { data: ic } = await supabaseAdmin
        .from("site_integration_configs")
        .select("config")
        .eq("service", "anthropic")
        .maybeSingle();
      anthropicKey = (ic?.config as Record<string, string> | null)?.api_key;
    }
    if (!anthropicKey) {
      throw new Error(
        "Anthropic API-Key nicht konfiguriert. Bitte in Admin → Integrationen hinterlegen oder als ANTHROPIC_API_KEY-Secret setzen.",
      );
    }

    // 5. Call Claude Messages API
    logStep("Calling Claude", { adminId: user.id, transcriptChars: transcript.length });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_DEFINITION],
        // Force Claude to call our tool — guarantees structured, valid output.
        tool_choice: { type: "tool", name: "draft_article" },
        messages: [{ role: "user", content: transcript }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      logStep("Claude error", { status: claudeResponse.status, body: errText.slice(0, 500) });
      throw new Error(`Claude API ${claudeResponse.status}: ${errText.slice(0, 200)}`);
    }

    const claudeData = await claudeResponse.json();
    const blocks = Array.isArray(claudeData?.content) ? claudeData.content : [];
    const toolUse = blocks.find(
      (b: { type?: string; name?: string }) => b?.type === "tool_use" && b?.name === "draft_article",
    ) as { input?: { title?: unknown; excerpt?: unknown; body_html?: unknown } } | undefined;

    if (!toolUse?.input) {
      logStep("No tool_use block", { blocks: JSON.stringify(blocks).slice(0, 500) });
      throw new Error("Claude hat das draft_article-Tool nicht aufgerufen");
    }

    const input = toolUse.input;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const excerpt = typeof input.excerpt === "string" ? input.excerpt.trim() : "";
    const body_html = typeof input.body_html === "string" ? stripUnsafeHtml(input.body_html.trim()) : "";

    if (!title || !body_html) {
      throw new Error("Generierter Artikel ist unvollständig (Titel oder Inhalt fehlen)");
    }

    logStep("Success", { titleLen: title.length, bodyLen: body_html.length });

    return new Response(
      JSON.stringify({ title, excerpt, body_html }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message });
    const status = message === "Unauthorized" || message === "Admin access required" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
