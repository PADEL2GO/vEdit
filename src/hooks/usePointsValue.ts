import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface PointsValue {
  centsPerPoint: number;
  maxPercent: number;
  enabled: boolean;
  isLoading: boolean;
}

/**
 * Reads the admin-configured P2G points exchange rate from site_settings.
 * centsPerPoint: how many cents one point is worth (100 / credits_per_euro).
 * maxPercent: max share of a payment that may be covered by points.
 * enabled: whether points-as-payment is currently switched on.
 */
export function usePointsValue(): PointsValue {
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.pointsValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("credits_per_euro, credits_payment_max_percent, feature_credits_payment_enabled")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // admin-configured rate, rarely changes
  });

  const d = data as any;
  const creditsPerEuro: number = d?.credits_per_euro ?? 100;

  return {
    centsPerPoint: 100 / creditsPerEuro,
    maxPercent: d?.credits_payment_max_percent ?? 50,
    enabled: d?.feature_credits_payment_enabled ?? false,
    isLoading,
  };
}
