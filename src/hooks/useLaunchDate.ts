import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fallback, falls noch kein Launch-Datum in site_settings gepflegt ist. */
const DEFAULT_LAUNCH = new Date("2026-07-01T00:00:00");

/**
 * Globales Launch-Datum aus `site_settings.launch_date` (id = "global").
 * Wird im Admin → Features gepflegt und treibt Homepage-Countdown + Placeholder.
 */
export function useLaunchDate() {
  const { data, isLoading } = useQuery({
    queryKey: ["site-settings", "launch_date"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("launch_date")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.launch_date ?? null) as string | null;
    },
    staleTime: 60_000,
  });

  const launchDate = data ? new Date(data) : DEFAULT_LAUNCH;
  return {
    launchDate,
    isLoading,
    hasLaunched: launchDate.getTime() <= Date.now(),
  };
}
