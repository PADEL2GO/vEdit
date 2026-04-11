import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/queryKeys";

export function useLocationMutations() {
  const queryClient = useQueryClient();

  const toggleCourtMutation = useMutation({
    mutationFn: async ({ courtId, isActive }: { courtId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("courts")
        .update({ is_active: isActive })
        .eq("id", courtId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Court aktualisiert");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const toggleLocationOnline = useMutation({
    mutationFn: async ({ locationId, isOnline }: { locationId: string; isOnline: boolean }) => {
      const { error } = await supabase
        .from("locations")
        .update({ is_online: isOnline })
        .eq("id", locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const toggleLocationFeature = useMutation({
    mutationFn: async ({
      locationId,
      feature,
      enabled,
    }: {
      locationId: string;
      feature: "rewards_enabled" | "ai_analysis_enabled" | "vending_enabled";
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from("locations")
        .update({ [feature]: enabled })
        .eq("id", locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Einstellung aktualisiert");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Standort gelöscht");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: () => {
      toast.error("Fehler beim Löschen");
    },
  });

  return {
    toggleCourtMutation,
    toggleLocationOnline,
    toggleLocationFeature,
    deleteLocationMutation,
  };
}
