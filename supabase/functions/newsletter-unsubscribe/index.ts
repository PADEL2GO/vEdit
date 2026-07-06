import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://www.padel2go-official.com","https://padel2go-official.com",
  "https://www.padel2go-official.de","https://padel2go-official.de",
  "https://padel2go.lovable.app","https://padel2go.de",
  "http://localhost:5173","http://localhost:8080",
];
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com") || origin.endsWith(".vercel.app")) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});

serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req.headers.get("origin")) });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { token } = await req.json().catch(() => ({}));
    if (!token) return new Response(JSON.stringify({ error: "Token fehlt" }), { status: 400, headers });
    const { data: row } = await admin.from("newsletter_subscribers")
      .select("id, unsubscribed_at").eq("unsubscribe_token", token).maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: "Ungültiger Link" }), { status: 404, headers });
    if (!row.unsubscribed_at) {
      await admin.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", row.id);
    }
    return new Response(JSON.stringify({ success: true }), { headers }); // idempotent
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
