import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  cta_url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  expires_at: string | null;
  broadcast_id: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: [QUERY_KEYS.notifications, user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      
      // Fetch notifications that are either not expired or have no expiration
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .or("expires_at.is.null,expires_at.gt.now()")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only add if not expired
          if (!newNotification.expires_at || new Date(newNotification.expires_at) > new Date()) {
            queryClient.setQueryData<Notification[]>(
              [QUERY_KEYS.notifications, user.id],
              (old) => {
                if (!old) return [newNotification];
                return [newNotification, ...old];
              }
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          queryClient.setQueryData<Notification[]>(
            [QUERY_KEYS.notifications, user.id],
            (old) => {
              if (!old) return old;
              // If notification is now expired, remove it
              if (updatedNotification.expires_at && new Date(updatedNotification.expires_at) <= new Date()) {
                return old.filter((n) => n.id !== updatedNotification.id);
              }
              return old.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              );
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          queryClient.setQueryData<Notification[]>(
            [QUERY_KEYS.notifications, user.id],
            (old) => {
              if (!old) return old;
              return old.filter((n) => n.id !== deletedId);
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = notificationsQuery.data?.filter(n => !n.read_at).length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.notifications] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.notifications] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.notifications] });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteAll: deleteAllMutation.mutateAsync,
  };
}
