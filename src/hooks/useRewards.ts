import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { RewardInstance, RewardsSummary, RewardsListResponse } from "@/types/rewards";

// Re-export types for backwards compatibility
export type { RewardInstance, RewardsSummary, RewardsListResponse } from "@/types/rewards";

export function useRewards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: [QUERY_KEYS.rewards, "summary"],
    queryFn: async (): Promise<RewardsSummary> => {
      const { data, error } = await supabase.functions.invoke("rewards-api", {
        body: { action: "summary" },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.rewards, "list"],
    queryFn: async (): Promise<RewardsListResponse> => {
      const { data, error } = await supabase.functions.invoke("rewards-api", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardInstanceId: string) => {
      const { data, error } = await supabase.functions.invoke("rewards-claim", {
        body: { rewardInstanceId },
      });
      if (error) throw error;
      return data as { success: boolean; points: number; newBalance: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.rewards] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.account] });
    },
  });

  const dailyLoginMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("rewards-api", {
        body: { action: "daily_login" },
      });
      if (error) throw error;
      return data as { success: boolean; reason?: string; alreadyClaimed?: boolean; message?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.rewards] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.account] });
      }
    },
  });

  const instagramTagMutation = useMutation({
    mutationFn: async (params: { instagramHandle?: string; postUrl?: string }) => {
      const { data, error } = await supabase.functions.invoke("rewards-api", {
        body: { action: "instagram_tag", ...params },
      });
      if (error) throw error;
      return data as { success: boolean; reason?: string; message?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.rewards] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.account] });
      }
    },
  });

  return {
    summary: summaryQuery.data,
    claimable: listQuery.data?.claimable || [],
    pending: listQuery.data?.pending || [],
    history: listQuery.data?.history || [],
    isLoading: summaryQuery.isLoading || listQuery.isLoading,
    claimReward: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
    // New actions
    triggerDailyLogin: dailyLoginMutation.mutateAsync,
    isDailyLoginPending: dailyLoginMutation.isPending,
    submitInstagramTag: instagramTagMutation.mutateAsync,
    isInstagramTagPending: instagramTagMutation.isPending,
  };
}
