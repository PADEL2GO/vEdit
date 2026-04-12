import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStreakMultiplier } from "@/lib/bookingCredits";

/** Returns ISO year-week key like "2026-W15" for any date. */
function isoWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0); // avoid DST edge cases
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 -
        3 +
        ((jan4.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function useWeeklyBookingStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ["weekly-booking-streak", userId],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .eq("user_id", userId!)
        .neq("status", "cancelled")
        .gte("start_time", threeMonthsAgo.toISOString())
        .order("start_time", { ascending: false });

      if (error) throw error;

      const weekSet = new Set(
        (data || []).map((b) => isoWeekKey(new Date(b.start_time)))
      );

      // Count consecutive weeks backwards from current week
      let weekStreak = 0;
      const cursor = new Date();
      for (let i = 0; i < 13; i++) {
        if (!weekSet.has(isoWeekKey(cursor))) break;
        weekStreak++;
        cursor.setDate(cursor.getDate() - 7);
      }

      const multiplier = getStreakMultiplier(weekStreak);
      const nextMultiplier = getStreakMultiplier(weekStreak + 1);

      return {
        weekStreak,
        multiplier,
        nextMultiplier,
        multiplierWillIncrease: nextMultiplier > multiplier,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
