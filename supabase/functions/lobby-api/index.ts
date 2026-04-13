import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
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

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LOBBY-API] ${step}${detailsStr}`);
};

// Reservation TTL in minutes
const RESERVATION_TTL_MINUTES = 10;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    logStep("Action received", { action });

    // Actions that require auth
    const authActions = ['create_lobby', 'join_lobby', 'leave_lobby', 'cancel_lobby', 'get_my_lobbies', 'admin_cancel_lobbies_for_court'];
    
    let user = null;
    if (authActions.includes(action)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authorization required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = userData.user;
      logStep("User authenticated", { userId: user.id });
    }

    switch (action) {
      // ============================================
      // CREATE LOBBY
      // ============================================
      case "create_lobby": {
        const { 
          booking_id, location_id, court_id, start_time, end_time,
          capacity = 4, skill_min, skill_max, price_total_cents, 
          is_private = false, description 
        } = body;

        if (!location_id || !court_id || !start_time || !end_time || !price_total_cents) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user's skill level for default range
        const { data: userSkill } = await supabaseAdmin
          .from("skill_stats")
          .select("skill_level")
          .eq("user_id", user!.id)
          .single();

        const userLevel = userSkill?.skill_level || 5;
        const finalSkillMin = skill_min ?? Math.max(1, userLevel - 1);
        const finalSkillMax = skill_max ?? Math.min(10, userLevel + 1);

        const pricePerPlayer = Math.ceil(price_total_cents / capacity);

        // Create lobby
        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .insert({
            host_user_id: user!.id,
            booking_id,
            location_id,
            court_id,
            start_time,
            end_time,
            capacity,
            skill_min: finalSkillMin,
            skill_max: finalSkillMax,
            price_total_cents,
            price_per_player_cents: pricePerPlayer,
            is_private,
            description,
          })
          .select()
          .single();

        if (lobbyError) {
          logStep("Failed to create lobby", { error: lobbyError.message });
          return new Response(JSON.stringify({ error: lobbyError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Add host as paid member (they already paid for the booking)
        await supabaseAdmin.from("lobby_members").insert({
          lobby_id: lobby.id,
          user_id: user!.id,
          status: "paid",
          paid_at: new Date().toISOString(),
        });

        // Create lobby_created event
        await supabaseAdmin.from("lobby_events").insert({
          lobby_id: lobby.id,
          actor_id: user!.id,
          event_type: "lobby_created",
          metadata: { capacity, skill_range: `${finalSkillMin}-${finalSkillMax}` },
        });

        logStep("Lobby created", { lobbyId: lobby.id });

        return new Response(JSON.stringify({ lobby }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LIST LOBBIES
      // ============================================
      case "list_lobbies": {
        const { 
          location_id, date_from, date_to, skill_min, skill_max, 
          only_available = true, limit = 50 
        } = body;

        let query = supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug, city),
            courts (name),
            lobby_members (id, user_id, status)
          `)
          .eq("status", "open")
          .eq("is_private", false)
          .order("start_time", { ascending: true })
          .limit(limit);

        if (location_id) {
          query = query.eq("location_id", location_id);
        }

        if (date_from) {
          query = query.gte("start_time", date_from);
        }

        if (date_to) {
          query = query.lte("start_time", date_to);
        }

        if (skill_min) {
          query = query.gte("skill_max", skill_min);
        }

        if (skill_max) {
          query = query.lte("skill_min", skill_max);
        }

        const { data: lobbies, error: lobbiesError } = await query;

        if (lobbiesError) {
          return new Response(JSON.stringify({ error: lobbiesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Calculate member counts and filter by availability
        const lobbiesWithStats = (lobbies || []).map((lobby: any) => {
          const activeMembers = lobby.lobby_members?.filter(
            (m: any) => ['paid', 'joined', 'reserved'].includes(m.status)
          ) || [];
          const paidCount = lobby.lobby_members?.filter((m: any) => m.status === 'paid').length || 0;
          
          return {
            ...lobby,
            members_count: activeMembers.length,
            paid_count: paidCount,
            spots_available: lobby.capacity - activeMembers.length,
          };
        });

        const filtered = only_available 
          ? lobbiesWithStats.filter((l: any) => l.spots_available > 0)
          : lobbiesWithStats;

        return new Response(JSON.stringify({ lobbies: filtered }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // GET LOBBY DETAILS
      // ============================================
      case "get_lobby": {
        const { lobby_id } = body;

        if (!lobby_id) {
          return new Response(JSON.stringify({ error: "lobby_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug, city, address),
            courts (name)
          `)
          .eq("id", lobby_id)
          .single();

        if (lobbyError || !lobby) {
          return new Response(JSON.stringify({ error: "Lobby not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get members with profile info
        const { data: members } = await supabaseAdmin
          .from("lobby_members")
          .select("*, profiles:user_id (display_name, avatar_url, username)")
          .eq("lobby_id", lobby_id)
          .in("status", ["paid", "joined", "reserved"]);

        // Get skill levels
        const userIds = (members || []).map((m: any) => m.user_id);
        const { data: skillStats } = await supabaseAdmin
          .from("skill_stats")
          .select("user_id, skill_level")
          .in("user_id", userIds);

        const skillMap = new Map((skillStats || []).map((s: any) => [s.user_id, s.skill_level]));

        const membersWithSkill = (members || []).map((m: any) => ({
          ...m,
          skill_level: skillMap.get(m.user_id) || 5,
        }));

        // Calculate avg skill
        const paidMembers = membersWithSkill.filter((m: any) => m.status === 'paid');
        const avgSkill = paidMembers.length > 0
          ? Math.round(paidMembers.reduce((sum: number, m: any) => sum + m.skill_level, 0) / paidMembers.length * 10) / 10
          : lobby.skill_min;

        return new Response(JSON.stringify({ 
          lobby: {
            ...lobby,
            members: membersWithSkill,
            members_count: membersWithSkill.length,
            paid_count: paidMembers.length,
            avg_skill: avgSkill,
            spots_available: lobby.capacity - membersWithSkill.length,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // JOIN LOBBY (Reserve + Create Checkout)
      // ============================================
      case "join_lobby": {
        const { lobby_id } = body;

        if (!lobby_id) {
          return new Response(JSON.stringify({ error: "lobby_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get lobby with lock
        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .select("*")
          .eq("id", lobby_id)
          .eq("status", "open")
          .single();

        if (lobbyError || !lobby) {
          return new Response(JSON.stringify({ error: "Lobby not found or not open" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user already a member
        const { data: existingMember } = await supabaseAdmin
          .from("lobby_members")
          .select("id, status")
          .eq("lobby_id", lobby_id)
          .eq("user_id", user!.id)
          .single();

        if (existingMember && ['paid', 'joined', 'reserved'].includes(existingMember.status)) {
          return new Response(JSON.stringify({ error: "Already a member of this lobby" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check user's skill level
        const { data: userSkill } = await supabaseAdmin
          .from("skill_stats")
          .select("skill_level")
          .eq("user_id", user!.id)
          .single();

        const userLevel = userSkill?.skill_level || 5;
        if (userLevel < lobby.skill_min || userLevel > lobby.skill_max) {
          return new Response(JSON.stringify({ 
            error: `Your skill level (${userLevel}) is not in the required range (${lobby.skill_min}-${lobby.skill_max})` 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Count current active members
        const { data: activeMembers } = await supabaseAdmin
          .from("lobby_members")
          .select("id")
          .eq("lobby_id", lobby_id)
          .in("status", ["paid", "joined", "reserved"]);

        if ((activeMembers?.length || 0) >= lobby.capacity) {
          return new Response(JSON.stringify({ error: "Lobby is full" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create or update member with reservation
        const reservedUntil = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

        let memberId: string;
        if (existingMember) {
          await supabaseAdmin
            .from("lobby_members")
            .update({ 
              status: "reserved", 
              reserved_until: reservedUntil.toISOString() 
            })
            .eq("id", existingMember.id);
          memberId = existingMember.id;
        } else {
          const { data: newMember, error: memberError } = await supabaseAdmin
            .from("lobby_members")
            .insert({
              lobby_id,
              user_id: user!.id,
              status: "reserved",
              reserved_until: reservedUntil.toISOString(),
            })
            .select()
            .single();

          if (memberError) {
            return new Response(JSON.stringify({ error: memberError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          memberId = newMember.id;
        }

        // Create lobby event
        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "member_joined",
          metadata: { member_id: memberId },
        });

        // Send notifications to host and existing members
        const { data: existingPaidMembers } = await supabaseAdmin
          .from("lobby_members")
          .select("user_id")
          .eq("lobby_id", lobby_id)
          .eq("status", "paid")
          .neq("user_id", user!.id);

        const { data: userProfile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("user_id", user!.id)
          .single();

        const notifyUserIds = [
          lobby.host_user_id,
          ...(existingPaidMembers || []).map((m: any) => m.user_id)
        ].filter((id, i, arr) => id !== user!.id && arr.indexOf(id) === i);

        for (const notifyId of notifyUserIds) {
          await supabaseAdmin.from("notifications").insert({
            user_id: notifyId,
            type: "lobby_member_joined",
            title: "Neuer Spieler beigetreten",
            message: `${userProfile?.display_name || 'Ein Spieler'} ist deiner Lobby beigetreten.`,
            entity_type: "lobby",
            entity_id: lobby_id,
            cta_url: `/lobbies/${lobby_id}`,
          });
        }

        // Create Stripe checkout session
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
          return new Response(JSON.stringify({ error: "Payment not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        const { data: userEmail } = await supabaseClient.auth.getUser(
          req.headers.get("Authorization")?.replace("Bearer ", "") || ""
        );

        // Get location details
        const { data: location } = await supabaseAdmin
          .from("locations")
          .select("name")
          .eq("id", lobby.location_id)
          .single();

        const startTime = new Date(lobby.start_time);
        const requestOrigin = origin || "https://www.padel2go-official.de";

        const session = await stripe.checkout.sessions.create({
          customer_email: userEmail?.user?.email,
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: lobby.currency.toLowerCase(),
                product_data: {
                  name: `Lobby - ${location?.name || 'Padel Court'}`,
                  description: `Dein Anteil am ${startTime.toLocaleDateString('de-DE')} um ${startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`,
                },
                unit_amount: lobby.price_per_player_cents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${requestOrigin}/lobbies/${lobby_id}?payment=success`,
          cancel_url: `${requestOrigin}/lobbies/${lobby_id}?payment=cancelled`,
          expires_at: Math.floor(reservedUntil.getTime() / 1000),
          metadata: {
            type: "lobby_join",
            lobby_id: lobby.id,
            lobby_member_id: memberId,
            user_id: user!.id,
          },
        });

        // Store session ID
        await supabaseAdmin
          .from("lobby_members")
          .update({ stripe_checkout_session_id: session.id })
          .eq("id", memberId);

        logStep("Join checkout created", { lobbyId: lobby_id, memberId, sessionId: session.id });

        return new Response(JSON.stringify({ 
          checkout_url: session.url,
          member_id: memberId,
          reserved_until: reservedUntil.toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LEAVE LOBBY
      // ============================================
      case "leave_lobby": {
        const { lobby_id } = body;

        const { data: member } = await supabaseAdmin
          .from("lobby_members")
          .select("id, status")
          .eq("lobby_id", lobby_id)
          .eq("user_id", user!.id)
          .single();

        if (!member) {
          return new Response(JSON.stringify({ error: "Not a member" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (member.status === "paid") {
          return new Response(JSON.stringify({ error: "Cannot leave after paying. Contact support for refund." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobby_members")
          .update({ status: "cancelled" })
          .eq("id", member.id);

        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "member_left",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // CANCEL LOBBY (Host only)
      // ============================================
      case "cancel_lobby": {
        const { lobby_id } = body;

        const { data: lobby } = await supabaseAdmin
          .from("lobbies")
          .select("id, host_user_id")
          .eq("id", lobby_id)
          .single();

        if (!lobby || lobby.host_user_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Not authorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobbies")
          .update({ status: "cancelled" })
          .eq("id", lobby_id);

        // Notify all members
        const { data: members } = await supabaseAdmin
          .from("lobby_members")
          .select("user_id")
          .eq("lobby_id", lobby_id)
          .neq("user_id", user!.id);

        for (const member of members || []) {
          await supabaseAdmin.from("notifications").insert({
            user_id: member.user_id,
            type: "lobby_cancelled",
            title: "Lobby abgesagt",
            message: "Eine Lobby, der du beigetreten bist, wurde abgesagt.",
            entity_type: "lobby",
            entity_id: lobby_id,
          });
        }

        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "lobby_cancelled",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // ADMIN: CANCEL ALL LOBBIES FOR A COURT
      // ============================================
      case "admin_cancel_lobbies_for_court": {
        const { court_id } = body;

        if (!court_id) {
          return new Response(JSON.stringify({ error: "court_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user is admin
        const { data: adminRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!adminRole) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find active lobbies on this court
        const { data: lobbies, error: lobbiesError } = await supabaseAdmin
          .from("lobbies")
          .select("id, host_user_id")
          .eq("court_id", court_id)
          .in("status", ["open", "full"]);

        if (lobbiesError) {
          return new Response(JSON.stringify({ error: lobbiesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let cancelledCount = 0;

        for (const lobby of lobbies || []) {
          // Cancel lobby
          await supabaseAdmin
            .from("lobbies")
            .update({ status: "cancelled" })
            .eq("id", lobby.id);

          // Cancel all members (keep history, but mark as cancelled)
          await supabaseAdmin
            .from("lobby_members")
            .update({ status: "cancelled" })
            .eq("lobby_id", lobby.id);

          // Notify members + host
          const { data: members } = await supabaseAdmin
            .from("lobby_members")
            .select("user_id")
            .eq("lobby_id", lobby.id);

          const notifyUserIds = Array.from(
            new Set([lobby.host_user_id, ...(members || []).map((m: any) => m.user_id)])
          );

          for (const userId of notifyUserIds) {
            await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              type: "lobby_cancelled",
              title: "Lobby abgesagt",
              message: "Diese Lobby wurde wegen Court-Deaktivierung automatisch abgesagt.",
              entity_type: "lobby",
              entity_id: lobby.id,
              cta_url: `/lobbies/${lobby.id}`,
            });
          }

          await supabaseAdmin.from("lobby_events").insert({
            lobby_id: lobby.id,
            actor_id: user!.id,
            event_type: "lobby_cancelled_admin",
            metadata: { reason: "court_deactivated" },
          });

          cancelledCount++;
        }

        return new Response(JSON.stringify({ success: true, cancelledCount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // GET MY LOBBIES
      // ============================================
      case "get_my_lobbies": {
        // Lobbies where user is host
        const { data: hostedLobbies } = await supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug),
            courts (name),
            lobby_members (id, status)
          `)
          .eq("host_user_id", user!.id)
          .in("status", ["open", "full"])
          .order("start_time", { ascending: true });

        // Lobbies where user is member
        const { data: memberLobbies } = await supabaseAdmin
          .from("lobby_members")
          .select(`
            lobby_id,
            status,
            lobbies (
              *,
              locations (name, slug),
              courts (name),
              lobby_members (id, status)
            )
          `)
          .eq("user_id", user!.id)
          .in("status", ["paid", "joined", "reserved"]);

        return new Response(JSON.stringify({ 
          hosted: hostedLobbies || [],
          joined: (memberLobbies || []).map((m: any) => ({ ...m.lobbies, my_status: m.status })),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // CLEANUP EXPIRED (Cron)
      // ============================================
      case "cleanup_expired": {
        // Expire old reservations
        const { data: expired, error: expireError } = await supabaseAdmin
          .from("lobby_members")
          .update({ status: "expired" })
          .eq("status", "reserved")
          .lt("reserved_until", new Date().toISOString())
          .select("lobby_id, user_id");

        if (expireError) {
          logStep("Cleanup error", { error: expireError.message });
        } else {
          logStep("Expired reservations", { count: expired?.length || 0 });
        }

        // Log events for expired
        for (const exp of expired || []) {
          await supabaseAdmin.from("lobby_events").insert({
            lobby_id: exp.lobby_id,
            actor_id: exp.user_id,
            event_type: "member_expired",
          });
        }

        // Expire old lobbies (past end_time)
        await supabaseAdmin
          .from("lobbies")
          .update({ status: "expired" })
          .eq("status", "open")
          .lt("end_time", new Date().toISOString());

        return new Response(JSON.stringify({ 
          expired_reservations: expired?.length || 0 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
