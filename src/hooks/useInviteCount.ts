import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useInviteCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count: inviteCount, error } = await supabase
        .from("booking_participants")
        .select("*", { count: "exact", head: true })
        .eq("invited_user_id", user.id)
        .eq("status", "pending_invite");

      if (error) {
        console.error("Error fetching invite count:", error);
        setCount(0);
      } else {
        setCount(inviteCount || 0);
      }
    } catch (err) {
      console.error("Error in useInviteCount:", err);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("invite-count-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_participants",
          filter: `invited_user_id=eq.${user.id}`,
        },
        () => {
          // Refetch count on any change
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return { count, loading, refetch: fetchCount };
}
