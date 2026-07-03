import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export type FeatureName =
  | "lobbies"
  | "league"
  | "events"
  | "rewards"
  | "matching"
  | "p2g"
  | "marketplace"
  | "friends";

export type FeatureState = "visible" | "demo" | "hidden";

const FEATURE_NAMES: FeatureName[] = [
  "lobbies",
  "league",
  "events",
  "rewards",
  "matching",
  "p2g",
  "marketplace",
  "friends",
];

// 3-state feature model: each feature_<name>_state column is "visible" (everyone),
// "demo" (admins only) or "hidden" (nobody). canSee folds in admin identity.
export const useFeatureToggles = () => {
  const { isAdmin } = useAdminAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["feature-toggles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "feature_lobbies_state, feature_league_state, feature_events_state, feature_rewards_state, feature_matching_state, feature_p2g_state, feature_marketplace_state, feature_friends_state"
        )
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // feature flags rarely change
  });

  const row = data as any;

  const states = FEATURE_NAMES.reduce((acc, name) => {
    const value = row?.[`feature_${name}_state`];
    acc[name] = value === "visible" || value === "demo" ? value : "hidden";
    return acc;
  }, {} as Record<FeatureName, FeatureState>);

  const canSee = (feature: FeatureName): boolean => {
    const state = states[feature];
    return state === "visible" || (state === "demo" && isAdmin);
  };

  return {
    states,
    canSee,
    lobbies_enabled: canSee("lobbies"),
    league_enabled: canSee("league"),
    events_enabled: canSee("events"),
    rewards_enabled: canSee("rewards"),
    matching_enabled: canSee("matching"),
    p2g_enabled: canSee("p2g"),
    marketplace_enabled: canSee("marketplace"),
    friends_enabled: canSee("friends"),
    isLoading,
    refetch,
  };
};
