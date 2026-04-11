import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Friend {
  id: string;
  friendshipId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  playCredits: number;
  lifetimeCredits: number;
  skillLevel: number;
  aiRank: number | null;
  friendsSince: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
  type: "received" | "sent";
}

export interface FriendshipStatus {
  status: "none" | "pending" | "accepted" | "declined" | "blocked" | "cancelled";
  friendshipId: string | null;
  isRequester?: boolean;
}

export function useFriendships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch friends list with deduplication
  const friends = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async (): Promise<Friend[]> => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "list" },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const rawFriends: Friend[] = response.data?.friends || [];
      
      // Deduplicate friends by id as a safety net
      const seen = new Set<string>();
      const uniqueFriends = rawFriends.filter((friend) => {
        if (seen.has(friend.id)) {
          console.warn(`[useFriendships] Duplicate friend detected: ${friend.id}`);
          return false;
        }
        seen.add(friend.id);
        return true;
      });

      return uniqueFriends;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  // Fetch pending requests
  const pendingRequests = useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async (): Promise<{ received: FriendRequest[]; sent: FriendRequest[] }> => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "requests" },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        received: response.data?.received || [],
        sent: response.data?.sent || [],
      };
    },
    enabled: !!user,
  });

  // Send friend request
  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "request", addresseeId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      toast.success("Freundschaftsanfrage gesendet");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Senden der Anfrage");
    },
  });

  // Accept friend request
  const acceptRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "accept", friendshipId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Freundschaftsanfrage angenommen");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Annehmen");
    },
  });

  // Decline friend request
  const declineRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "decline", friendshipId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Anfrage abgelehnt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Ablehnen");
    },
  });

  // Cancel own request
  const cancelRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "cancel", friendshipId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      toast.success("Anfrage zurückgezogen");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Zurückziehen");
    },
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "block", userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      toast.success("Benutzer blockiert");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Blockieren");
    },
  });

  // Remove friend
  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await supabase.functions.invoke("friends-api", {
        body: { action: "remove", friendshipId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
      toast.success("Freund entfernt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Entfernen");
    },
  });

  // Get friendship status with a specific user
  const getFriendshipStatus = async (targetUserId: string): Promise<FriendshipStatus> => {
    const response = await supabase.functions.invoke("friends-api", {
      body: { action: "status", targetUserId },
    });

    if (response.error) {
      return { status: "none", friendshipId: null };
    }

    return response.data as FriendshipStatus;
  };

  // Hook for friendship status with a specific user
  const useFriendshipStatus = (targetUserId: string | undefined) => {
    return useQuery({
      queryKey: ["friendship-status", user?.id, targetUserId],
      queryFn: () => getFriendshipStatus(targetUserId!),
      enabled: !!user && !!targetUserId && targetUserId !== user.id,
    });
  };

  return {
    friends: friends.data || [],
    isLoadingFriends: friends.isLoading,
    
    pendingReceived: pendingRequests.data?.received || [],
    pendingSent: pendingRequests.data?.sent || [],
    isLoadingRequests: pendingRequests.isLoading,
    
    sendRequest: sendRequest.mutate,
    isSendingRequest: sendRequest.isPending,
    
    acceptRequest: acceptRequest.mutate,
    isAcceptingRequest: acceptRequest.isPending,
    
    declineRequest: declineRequest.mutate,
    isDecliningRequest: declineRequest.isPending,
    
    cancelRequest: cancelRequest.mutate,
    isCancellingRequest: cancelRequest.isPending,
    
    blockUser: blockUser.mutate,
    isBlockingUser: blockUser.isPending,
    
    removeFriend: removeFriend.mutate,
    isRemovingFriend: removeFriend.isPending,
    
    useFriendshipStatus,
    
    refetchFriends: friends.refetch,
    refetchRequests: pendingRequests.refetch,
  };
}
