import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MatchOptInSettings {
  id: string;
  user_id: string;
  is_active: boolean;
  preferred_location_ids: string[];
  skill_range_min: number;
  skill_range_max: number;
  availability_json: AvailabilitySchedule;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  mon: string[];
  tue: string[];
  wed: string[];
  thu: string[];
  fri: string[];
  sat: string[];
  sun: string[];
}

const defaultAvailability: AvailabilitySchedule = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

export function useMatchOptIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["match-opt-in", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("match_opt_in_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const availJson = data.availability_json as unknown;
        return {
          ...data,
          availability_json: (availJson as AvailabilitySchedule) || defaultAvailability,
        } as MatchOptInSettings;
      }
      
      return null;
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<MatchOptInSettings, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user) throw new Error("Not authenticated");

      const payload: Record<string, unknown> = {
        user_id: user.id,
        is_active: updates.is_active,
        preferred_location_ids: updates.preferred_location_ids,
        skill_range_min: updates.skill_range_min,
        skill_range_max: updates.skill_range_max,
        availability_json: updates.availability_json,
      };

      const { data, error } = await supabase
        .from("match_opt_in_settings")
        .upsert(payload as never, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-opt-in", user?.id] });
      toast.success("Einstellungen gespeichert!");
    },
    onError: (error: Error) => {
      console.error("Error saving match opt-in settings:", error);
      toast.error("Fehler beim Speichern");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("match_opt_in_settings")
        .upsert({ user_id: user.id, is_active: isActive }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-opt-in", user?.id] });
      toast.success(data.is_active ? "Matchmaking aktiviert!" : "Matchmaking deaktiviert");
    },
    onError: (error: Error) => {
      console.error("Error toggling match opt-in:", error);
      toast.error("Fehler beim Ändern");
    },
  });

  return {
    settings,
    isLoading,
    upsertSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
    toggleActive: toggleActive.mutate,
    isTogglingActive: toggleActive.isPending,
  };
}
