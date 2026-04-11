import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whitelist of features club owners can update
// Must match COURT_FEATURES keys in src/lib/courtFeatures.ts
const ALLOWED_FEATURES = [
  "wc",
  "dusche",
  "umkleide",
  "flutlicht",
  "parkplaetze",
  "schlaegerverleih",
  "ballverleih",
  "wifi",
  "barrierefrei",
  "indoor",
  "outdoor",
  "gastro",
];

// Platform features that club owners can toggle
const ALLOWED_PLATFORM_FEATURES = [
  "rewards_enabled",
  "ai_analysis_enabled",
  "vending_enabled",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is a club owner OR club member (include club_id in one query)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "club_owner")
      .maybeSingle();

    const { data: clubUserData } = await supabase
      .from("club_users")
      .select("id, role_in_club, club_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    // Must be either club_owner role OR manager in club_users
    const isClubOwner = !!roleData;
    const isClubManager = clubUserData?.role_in_club === "manager";
    
    console.log("[Auth Check]", {
      userId: user.id,
      userEmail: user.email,
      isClubOwner,
      isClubManager,
      clubUserData,
      roleData,
    });
    
    if (!isClubOwner && !isClubManager) {
      return new Response(JSON.stringify({ error: "Not authorized to update court features" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept both POST (from supabase.functions.invoke) and PATCH
    console.log("[Request Meta]", { method: req.method });
    if (req.method !== "POST" && req.method !== "PATCH") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { courtId, features, platformFeatures } = body;

    console.log("[Request Body]", {
      courtId,
      featureKeys: features ? Object.keys(features) : [],
      platformFeatureKeys: platformFeatures ? Object.keys(platformFeatures) : [],
    });

    if (!courtId || !features) {
      return new Response(JSON.stringify({ error: "Court ID and features required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user has assignment for this court (via club_owner_assignments OR club_court_assignments)
    let locationId: string | null = null;

    // First try club_owner_assignments (legacy)
    const { data: ownerAssignment, error: ownerAssignmentError } = await supabase
      .from("club_owner_assignments")
      .select("id, court_id, courts(id, location_id)")
      .eq("user_id", user.id)
      .eq("court_id", courtId)
      .maybeSingle();

    console.log("[Legacy Assignment Check]", {
      ownerAssignment,
      ownerAssignmentError,
      found: !!ownerAssignment,
    });

    if (ownerAssignment?.courts) {
      // courts is returned as an object when using .single() or .maybeSingle()
      const courtsData = ownerAssignment.courts as unknown as { id: string; location_id: string };
      locationId = courtsData.location_id;
      console.log("[Legacy Assignment] locationId from legacy:", locationId);
    }

    // If not found, try club_court_assignments via club_users
    if (!locationId && clubUserData?.club_id) {
      const clubId = clubUserData.club_id;
      console.log("[Club Assignment Check] Looking for court assignment", { clubId, courtId });

      // Check if this court is assigned to the user's club
      const { data: courtAssignment, error: courtAssignmentError } = await supabase
        .from("club_court_assignments")
        .select("court_id, court:courts(id, location_id)")
        .eq("club_id", clubId)
        .eq("court_id", courtId)
        .maybeSingle();

      console.log("[Club Assignment Result]", {
        courtAssignment,
        courtAssignmentError,
        found: !!courtAssignment,
        courtData: courtAssignment?.court,
      });

      if (courtAssignment?.court) {
        const courtData = courtAssignment.court as unknown as { id: string; location_id: string };
        locationId = courtData.location_id;
        console.log("[Club Assignment] locationId from club assignment:", locationId);
      }
    }

    console.log("[Final locationId]", { locationId, userId: user.id, courtId });

    if (!locationId) {
      return new Response(JSON.stringify({ error: "No assignment for this court" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter features to only allowed ones
    const sanitizedFeatures: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(features)) {
      if (ALLOWED_FEATURES.includes(key) && typeof value === "boolean") {
        sanitizedFeatures[key] = value;
      }
    }

    // Filter platform features to only allowed ones
    const sanitizedPlatformFeatures: Record<string, boolean> = {};
    if (platformFeatures && typeof platformFeatures === "object") {
      for (const [key, value] of Object.entries(platformFeatures)) {
        if (ALLOWED_PLATFORM_FEATURES.includes(key) && typeof value === "boolean") {
          sanitizedPlatformFeatures[key] = value;
        }
      }
    }

    // Get current location features
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("features_json")
      .eq("id", locationId)
      .single();

    if (locationError) {
      console.error("Location fetch error:", locationError);
      return new Response(JSON.stringify({ error: "Failed to fetch location" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge features (preserve existing non-whitelisted features)
    const currentFeatures = (location.features_json as Record<string, unknown>) || {};
    const updatedFeatures = { ...currentFeatures, ...sanitizedFeatures };

    // Build update payload
    const updatePayload: Record<string, unknown> = { 
      features_json: updatedFeatures,
      updated_at: new Date().toISOString(),
      ...sanitizedPlatformFeatures, // Add platform features directly to payload
    };

    // Update location
    const { error: updateError } = await supabase
      .from("locations")
      .update(updatePayload)
      .eq("id", locationId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update features" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Court features updated by user:", user.id, "court:", courtId, "features:", sanitizedFeatures, "platform:", sanitizedPlatformFeatures);

    return new Response(JSON.stringify({ success: true, features: updatedFeatures }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Club court update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
