import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://www.padel2go-official.de",
  "https://padel2go-official.de",
  "https://padel2go.lovable.app",
  "https://padel2go.de",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept both GET and POST requests
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentUserId = userData.user.id;

    // Parse query from URL (GET) or body (POST)
    let query = "";
    let limit = 10;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      query = url.searchParams.get("query")?.toLowerCase().trim() || "";
      limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 20);
    } else {
      const body = await req.json();
      query = (body.query || "").toLowerCase().trim();
      limit = Math.min(parseInt(body.limit || "10", 10), 20);
    }

    // Require at least 3 characters to prevent enumeration attacks
    if (query.length < 3) {
      return new Response(JSON.stringify({ 
        users: [],
        error: query.length > 0 ? "Bitte gib mindestens 3 Zeichen ein" : undefined 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for query to bypass RLS (we filter manually)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Searching for users with query: "${query}", limit: ${limit}, currentUserId: ${currentUserId}`);

    // Contains search on username (case-insensitive) - matches anywhere in username
    const { data: users, error: searchError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .not("username", "is", null)
      .ilike("username", `%${query}%`)
      .neq("user_id", currentUserId) // Exclude self
      .limit(limit);

    console.log(`Found ${users?.length || 0} users matching query "${query}"`);

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return minimal payload with `id` for frontend compatibility
    const results = (users || []).map((u) => ({
      id: u.user_id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
    }));

    return new Response(JSON.stringify({ users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in user-search:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
