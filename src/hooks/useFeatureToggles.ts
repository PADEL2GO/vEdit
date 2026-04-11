import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureToggles {
  lobbies_enabled: boolean;
  matching_enabled: boolean;
  league_enabled: boolean;
  events_enabled: boolean;
  p2g_enabled: boolean;
  isLoading: boolean;
}

export const useFeatureToggles = () => {
  const [features, setFeatures] = useState<FeatureToggles>({
    lobbies_enabled: false,
    matching_enabled: false,
    league_enabled: false,
    events_enabled: false,
    p2g_enabled: false,
    isLoading: true,
  });

  const fetchFeatures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("feature_lobbies_enabled, feature_matching_enabled, feature_league_enabled, feature_events_enabled, feature_p2g_enabled")
        .eq("id", "global")
        .single();

      if (error) {
        console.error("Error fetching feature toggles:", error);
        return;
      }

      setFeatures({
        lobbies_enabled: data?.feature_lobbies_enabled ?? false,
        matching_enabled: data?.feature_matching_enabled ?? false,
        league_enabled: data?.feature_league_enabled ?? false,
        events_enabled: (data as any)?.feature_events_enabled ?? false,
        p2g_enabled: (data as any)?.feature_p2g_enabled ?? false,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching feature toggles:", error);
      setFeatures(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return { ...features, refetch: fetchFeatures };
};
