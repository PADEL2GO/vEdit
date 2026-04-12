import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to real-time INSERT events on the notifications table
 * for the current user. Shows a toast and invalidates the local cache.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message: string; cta_url?: string };
          toast(n.title, {
            description: n.message,
            action: n.cta_url
              ? { label: "Ansehen", onClick: () => { window.location.href = n.cta_url!; } }
              : undefined,
          });
          queryClient.invalidateQueries({ queryKey: ["dashboard-notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
