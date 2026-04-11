import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationParams {
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  ctaUrl?: string;
  metadata?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(
  supabase: any,
  params: NotificationParams
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    actor_id: params.actorId,
    type: params.type,
    title: params.title,
    message: params.message,
    entity_type: params.entityType,
    entity_id: params.entityId,
    cta_url: params.ctaUrl,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", userId)
    .single();
  return data as { display_name: string | null; username: string | null } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's auth token for RLS
    const authHeader = req.headers.get("Authorization");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // Service client for notifications (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[friends-api] Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body for action-based routing (POST requests)
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const url = new URL(req.url);
    let path = url.pathname.replace("/friends-api", "");
    
    // Support action-based routing from body
    const action = body.action as string | undefined;
    if (action) {
      path = `/${action}`;
    }

    console.log(`[friends-api] ${req.method} ${path} - User: ${user.id}`);

    // POST /request - Send friend request
    if (path === "/request") {
      const addresseeId = body.addresseeId as string;

      if (!addresseeId) {
        return new Response(JSON.stringify({ error: "addresseeId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (addresseeId === user.id) {
        return new Response(JSON.stringify({ error: "Cannot send friend request to yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing friendship in either direction
      const { data: existing } = await supabaseAdmin
        .from("friendships")
        .select("id, status, requester_id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "blocked") {
          return new Response(JSON.stringify({ error: "Cannot send request" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (existing.status === "accepted") {
          return new Response(JSON.stringify({ error: "Already friends" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (existing.status === "pending") {
          return new Response(JSON.stringify({ error: "Request already pending" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Create friendship request
      const { data: friendship, error: insertError } = await supabaseUser
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get requester profile for notification
      const requesterProfile = await getProfile(supabaseAdmin, user.id);
      const requesterName = requesterProfile?.display_name || requesterProfile?.username || "Someone";

      // Create notification for addressee
      await createNotification(supabaseAdmin, {
        userId: addresseeId,
        actorId: user.id,
        type: "friend_request_received",
        title: "Neue Freundschaftsanfrage",
        message: `${requesterName} möchte mit dir befreundet sein`,
        entityType: "friendship",
        entityId: friendship.id,
        ctaUrl: "/friends?tab=requests",
      });

      return new Response(JSON.stringify({ success: true, friendship }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /accept - Accept friend request
    if (path === "/accept") {
      const friendshipId = body.friendshipId as string;

      const { data: friendship, error: fetchError } = await supabaseUser
        .from("friendships")
        .select("*")
        .eq("id", friendshipId)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .single();

      if (fetchError || !friendship) {
        return new Response(JSON.stringify({ error: "Request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseUser
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify requester
      const addresseeProfile = await getProfile(supabaseAdmin, user.id);
      const addresseeName = addresseeProfile?.display_name || addresseeProfile?.username || "Someone";

      await createNotification(supabaseAdmin, {
        userId: friendship.requester_id,
        actorId: user.id,
        type: "friend_request_accepted",
        title: "Freundschaftsanfrage angenommen",
        message: `${addresseeName} hat deine Freundschaftsanfrage angenommen`,
        entityType: "friendship",
        entityId: friendshipId,
        ctaUrl: `/u/${addresseeProfile?.username || user.id}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /decline - Decline friend request
    if (path === "/decline") {
      const friendshipId = body.friendshipId as string;

      const { error: updateError } = await supabaseUser
        .from("friendships")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", friendshipId)
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /cancel - Cancel own request
    if (path === "/cancel") {
      const friendshipId = body.friendshipId as string;

      const { error: updateError } = await supabaseUser
        .from("friendships")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", friendshipId)
        .eq("requester_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /block - Block user
    if (path === "/block") {
      const targetUserId = body.userId as string;

      // Check for existing friendship
      const { data: existing } = await supabaseAdmin
        .from("friendships")
        .select("id, requester_id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        // Update existing to blocked
        await supabaseAdmin
          .from("friendships")
          .update({ status: "blocked", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        // Create new blocked friendship
        await supabaseAdmin
          .from("friendships")
          .insert({
            requester_id: user.id,
            addressee_id: targetUserId,
            status: "blocked",
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET or POST /list - Get friends list
    if (path === "/list") {
      const { data: friendships, error } = await supabaseUser
        .from("friendships")
        .select("id, requester_id, addressee_id, created_at")
        .eq("status", "accepted");

      if (error) {
        console.error("[friends-api] Error fetching friendships:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[friends-api] Found ${friendships?.length || 0} accepted friendships for user ${user.id}`);

      // Get friend user IDs - deduplicated
      const friendIdsSet = new Set<string>();
      friendships?.forEach((f: { requester_id: string; addressee_id: string }) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        friendIdsSet.add(friendId);
      });
      const friendIds = Array.from(friendIdsSet);

      console.log(`[friends-api] Unique friend IDs: ${friendIds.length}`);

      if (friendIds.length === 0) {
        return new Response(JSON.stringify({ friends: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get profiles for friends
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      // Get wallets for credit info
      const { data: wallets } = await supabaseAdmin
        .from("wallets")
        .select("user_id, play_credits, lifetime_credits")
        .in("user_id", friendIds);

      // Get skill stats for AI-calculated skill level
      const { data: skillStats } = await supabaseAdmin
        .from("skill_stats")
        .select("user_id, skill_level, ai_rank")
        .in("user_id", friendIds);

      // Build friends list - one entry per unique friend ID
      const friends = friendIds.map((friendId: string) => {
        const profile = profiles?.find((p: { user_id: string }) => p.user_id === friendId);
        const wallet = wallets?.find((w: { user_id: string }) => w.user_id === friendId);
        const skillStat = skillStats?.find((s: { user_id: string }) => s.user_id === friendId);
        // Find the first matching friendship for this friend
        const friendship = friendships?.find(
          (f: { requester_id: string; addressee_id: string }) => 
            f.requester_id === friendId || f.addressee_id === friendId
        );

        return {
          id: friendId,
          friendshipId: friendship?.id,
          displayName: profile?.display_name,
          username: profile?.username,
          avatarUrl: profile?.avatar_url,
          playCredits: wallet?.play_credits || 0,
          lifetimeCredits: wallet?.lifetime_credits || 0,
          skillLevel: skillStat?.skill_level || 0,
          aiRank: skillStat?.ai_rank || null,
          friendsSince: friendship?.created_at,
        };
      });

      console.log(`[friends-api] Returning ${friends.length} friends`);

      return new Response(JSON.stringify({ friends }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET or POST /requests - Get pending requests (received + sent)
    if (path === "/requests") {
      const { data: received, error: recError } = await supabaseUser
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      const { data: sent, error: sentError } = await supabaseUser
        .from("friendships")
        .select("id, addressee_id, created_at")
        .eq("requester_id", user.id)
        .eq("status", "pending");

      if (recError || sentError) {
        return new Response(JSON.stringify({ error: "Failed to fetch requests" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get profiles for requesters
      const receivedUserIds = received?.map((r: { requester_id: string }) => r.requester_id) || [];
      const sentUserIds = sent?.map((s: { addressee_id: string }) => s.addressee_id) || [];
      const allUserIds = [...receivedUserIds, ...sentUserIds];

      let profiles: Record<string, { display_name: string; username: string; avatar_url: string }> = {};
      if (allUserIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", allUserIds);

        profiles = (data || []).reduce((acc: typeof profiles, p: { user_id: string; display_name: string; username: string; avatar_url: string }) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      const receivedFormatted = (received || []).map((r: { id: string; requester_id: string; created_at: string }) => ({
        id: r.id,
        userId: r.requester_id,
        displayName: profiles[r.requester_id]?.display_name,
        username: profiles[r.requester_id]?.username,
        avatarUrl: profiles[r.requester_id]?.avatar_url,
        createdAt: r.created_at,
        type: "received" as const,
      }));

      const sentFormatted = (sent || []).map((s: { id: string; addressee_id: string; created_at: string }) => ({
        id: s.id,
        userId: s.addressee_id,
        displayName: profiles[s.addressee_id]?.display_name,
        username: profiles[s.addressee_id]?.username,
        avatarUrl: profiles[s.addressee_id]?.avatar_url,
        createdAt: s.created_at,
        type: "sent" as const,
      }));

      return new Response(JSON.stringify({ received: receivedFormatted, sent: sentFormatted }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET or POST /status - Get friendship status with specific user
    if (path === "/status" || path.startsWith("/status/")) {
      const targetUserId = body.targetUserId as string || path.replace("/status/", "");

      const { data: friendship } = await supabaseAdmin
        .from("friendships")
        .select("id, status, requester_id, addressee_id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (!friendship) {
        return new Response(JSON.stringify({ status: "none", friendshipId: null }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isRequester = friendship.requester_id === user.id;

      return new Response(
        JSON.stringify({
          status: friendship.status,
          friendshipId: friendship.id,
          isRequester,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /remove - Remove friend (unfriend)
    if (path === "/remove") {
      const friendshipId = body.friendshipId as string;

      // Delete the friendship entirely
      const { error } = await supabaseAdmin
        .from("friendships")
        .delete()
        .eq("id", friendshipId)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in friends-api:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
