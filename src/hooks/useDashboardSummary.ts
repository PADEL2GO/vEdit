import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aggregated queries for the DashboardHome page.
 * Each query is independent and runs in parallel via separate useQuery calls.
 */

export function useNextBooking(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-next-booking", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status, price_cents, location:locations(name, city), court:courts(name)")
        .eq("user_id", userId!)
        .neq("status", "cancelled")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function usePendingInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-pending-invites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_participants")
        .select("id, booking_id, share_price_cents, inviter_user_id")
        .eq("invited_user_id", userId!)
        .eq("status", "pending_invite");
      if (error) throw error;

      // Enrich with booking + inviter details
      const enriched = await Promise.all(
        (data || []).map(async (invite) => {
          const [{ data: booking }, { data: inviter }] = await Promise.all([
            supabase
              .from("bookings")
              .select("start_time, end_time, location:locations(name, city), court:courts(name)")
              .eq("id", invite.booking_id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("user_id", invite.inviter_user_id)
              .maybeSingle(),
          ]);
          return { ...invite, booking, inviter };
        })
      );
      return enriched;
    },
    enabled: !!userId,
  });
}

export function useUpcomingEvents(limit = 3) {
  return useQuery({
    queryKey: ["dashboard-upcoming-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, slug, start_at, city, image_url, ticket_url, capacity")
        .eq("is_published", true)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUnreadNotifications(userId: string | undefined, limit = 6) {
  return useQuery({
    queryKey: ["dashboard-notifications", userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, cta_url, created_at, read_at")
        .eq("user_id", userId!)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function usePendingFriendRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-friend-requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", userId!)
        .eq("status", "pending");
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("user_id", req.requester_id)
            .maybeSingle();
          return { ...req, profile };
        })
      );
      return enriched;
    },
    enabled: !!userId,
  });
}

export function useMonthlyBookingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-monthly-bookings", userId],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .neq("status", "cancelled")
        .gte("start_time", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useOnlineLocations(userCity?: string | null) {
  return useQuery({
    queryKey: ["dashboard-locations", userCity],
    queryFn: async () => {
      let q = supabase
        .from("locations")
        .select("id, name, city, address, main_image_url, slug")
        .eq("is_online", true)
        .order("name", { ascending: true });
      if (userCity) {
        q = q.ilike("city", `%${userCity}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

/** Admin broadcasts targeted at 'all' users that haven't expired */
export function useAdminBroadcasts() {
  return useQuery({
    queryKey: ["dashboard-broadcasts"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("admin_broadcasts")
        .select("id, title, message, cta_label, cta_url, expires_at, created_at")
        .eq("target_type", "all")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache — broadcasts don't change often
  });
}

/** Play streak: how many consecutive days the user has had at least one booking */
export function usePlayStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-streak", userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .eq("user_id", userId!)
        .neq("status", "cancelled")
        .gte("start_time", thirtyDaysAgo.toISOString())
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Unique booking dates (YYYY-MM-DD) descending
      const dateSet = new Set(
        (data || []).map((b) => b.start_time.slice(0, 10))
      );
      const dates = Array.from(dateSet).sort().reverse();

      if (dates.length === 0) return { streak: 0, lastPlayedDate: null };

      // Count streak backwards from today (or yesterday)
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      // Streak only counts if user played today or yesterday
      if (!dateSet.has(today) && !dateSet.has(yesterday)) {
        return { streak: 0, lastPlayedDate: dates[0] };
      }

      let streak = 0;
      let current = new Date();
      if (!dateSet.has(today)) current = new Date(Date.now() - 86400000);

      while (true) {
        const d = current.toISOString().slice(0, 10);
        if (!dateSet.has(d)) break;
        streak++;
        current.setDate(current.getDate() - 1);
        if (streak > 30) break;
      }

      return { streak, lastPlayedDate: dates[0] };
    },
    enabled: !!userId,
  });
}

/** Recent activity from friends (last 8 match analyses) */
export function useFriendActivity(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-friend-activity", userId],
    queryFn: async () => {
      // 1. Get accepted friend IDs
      const { data: friendships, error: fErr } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (fErr) throw fErr;
      const friendIds = (friendships || []).map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      if (friendIds.length === 0) return [];

      // 2. Get recent match analyses for those friends
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: matches, error: mErr } = await supabase
        .from("match_analyses")
        .select("id, user_id, result, credits_awarded, skill_level_snapshot, created_at")
        .in("user_id", friendIds)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(8);

      if (mErr) throw mErr;
      if (!matches?.length) return [];

      // 3. Enrich with profiles
      const uniqueIds = [...new Set(matches.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", uniqueIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return matches.map((m) => ({ ...m, profile: profileMap[m.user_id] ?? null }));
    },
    enabled: !!userId,
  });
}
