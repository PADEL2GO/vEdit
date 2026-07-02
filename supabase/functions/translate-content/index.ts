// supabase/functions/translate-content/index.ts
//
// Auto-translates admin-managed German content to English via DeepL and
// writes the result back into the matching *_en columns, respecting
// *_en_locked manual overrides.
//
// Reads the DeepL API key from Deno.env.get("DEEPL_API_KEY") first, then
// falls back to site_integration_configs.deepl.config.api_key. Detects
// DeepL Free vs Pro automatically by the ":fx" key suffix.
//
// Two usage modes:
//
//  POST { table, id, fields: ["title", "description"] }
//    → looks up the row, translates the listed DE fields, persists the
//      EN values (skipping any that are *_en_locked = true), returns the
//      updated row.
//
//  POST { text: "Hallo" }
//    → returns { translated: "Hello" } without touching the DB. Useful
//      for one-off translations from the admin UI (e.g. preview).
//
// Tables this function knows about live in TRANSLATABLE_TABLES below.
// Adding a new translatable column = extend that map.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FieldName = string;

const TRANSLATABLE_TABLES: Record<string, FieldName[]> = {
  partner_tiles: ["description"],
  location_teasers: ["title", "description", "city", "expected_date"],
  skypadel_gallery: ["alt_text"],
  partner_touchpoint_slides: ["title", "description"],
  qr_sections: ["title", "description"],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const resolveDeeplKey = async (client: SupabaseClient): Promise<string | null> => {
  const envKey = Deno.env.get("DEEPL_API_KEY");
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  const { data, error } = await client
    .from("site_integration_configs")
    .select("config")
    .eq("service", "deepl")
    .maybeSingle();
  if (error) return null;
  const cfg = (data?.config ?? {}) as Record<string, unknown>;
  const key = (cfg.api_key ?? cfg.apiKey ?? "") as string;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : null;
};

const deeplEndpoint = (key: string): string =>
  key.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";

const translateBatch = async (
  texts: string[],
  apiKey: string,
): Promise<string[]> => {
  if (texts.length === 0) return [];
  const endpoint = deeplEndpoint(apiKey);
  const body = new URLSearchParams();
  for (const text of texts) body.append("text", text);
  body.append("source_lang", "DE");
  body.append("target_lang", "EN-US");
  body.append("preserve_formatting", "1");
  body.append("formality", "default");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DeepL ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { translations?: Array<{ text: string }> };
  return (data.translations ?? []).map((t) => t.text);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase service credentials missing in env" });
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate caller + require admin role (same gate as generate-article)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return json(401, { error: "Unauthorized" });

  const { data: adminRole } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  const isSuperadmin = user.email === "fsteinfelder@padel2go.eu";
  if (!adminRole && !isSuperadmin) return json(403, { error: "Admin access required" });

  const apiKey = await resolveDeeplKey(client);
  if (!apiKey) {
    return json(503, {
      error:
        "DeepL API key not configured. Set DEEPL_API_KEY env var or store it in site_integration_configs.deepl.config.api_key",
    });
  }

  // Mode 1: ad-hoc text translation
  if (typeof body.text === "string") {
    try {
      const [translated] = await translateBatch([body.text], apiKey);
      return json(200, { translated: translated ?? "" });
    } catch (err) {
      return json(502, { error: (err as Error).message });
    }
  }

  // Mode 2: row translation + persistence
  const table = body.table as string | undefined;
  const id = body.id as string | undefined;
  const fields = body.fields as string[] | undefined;

  if (!table || !id || !Array.isArray(fields) || fields.length === 0) {
    return json(400, {
      error: "Required fields: { table, id, fields: string[] } OR { text }",
    });
  }

  const allowedFields = TRANSLATABLE_TABLES[table];
  if (!allowedFields) {
    return json(400, { error: `Table not registered for translation: ${table}` });
  }
  const invalid = fields.filter((f) => !allowedFields.includes(f));
  if (invalid.length) {
    return json(400, {
      error: `Fields not allowed for ${table}: ${invalid.join(", ")}`,
    });
  }

  // Pull the source row with all DE values + lock flags
  const lockColumns = fields.map((f) => `${f}_en_locked`);
  const enColumns = fields.map((f) => `${f}_en`);
  const selectCols = ["id", ...fields, ...enColumns, ...lockColumns].join(", ");

  const { data: row, error: fetchErr } = await client
    .from(table)
    .select(selectCols)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return json(500, { error: `DB read failed: ${fetchErr.message}` });
  if (!row) return json(404, { error: `Row not found: ${table}/${id}` });

  // Decide which fields actually need translation right now
  const fieldsToTranslate: Array<{ field: string; sourceText: string }> = [];
  for (const field of fields) {
    const isLocked = Boolean((row as Record<string, unknown>)[`${field}_en_locked`]);
    if (isLocked) continue;
    const source = (row as Record<string, unknown>)[field];
    if (typeof source !== "string" || source.trim().length === 0) continue;
    fieldsToTranslate.push({ field, sourceText: source });
  }

  if (fieldsToTranslate.length === 0) {
    return json(200, { row, updatedFields: [], skipped: fields });
  }

  let translated: string[];
  try {
    translated = await translateBatch(
      fieldsToTranslate.map((f) => f.sourceText),
      apiKey,
    );
  } catch (err) {
    return json(502, { error: (err as Error).message });
  }

  const updatePayload: Record<string, string | null> = {};
  fieldsToTranslate.forEach((f, i) => {
    updatePayload[`${f.field}_en`] = translated[i] ?? null;
  });

  const { data: updated, error: updateErr } = await client
    .from(table)
    .update(updatePayload)
    .eq("id", id)
    .select(selectCols)
    .maybeSingle();

  if (updateErr) return json(500, { error: `DB write failed: ${updateErr.message}` });

  return json(200, {
    row: updated,
    updatedFields: fieldsToTranslate.map((f) => f.field),
    skipped: fields.filter((f) => !fieldsToTranslate.find((x) => x.field === f)),
  });
});
