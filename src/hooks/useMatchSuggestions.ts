import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MatchSuggestion {
  id: string;
  user_id: string;
  matched_user_id: string;
  location_id: string | null;
  suggested_at: string;
  suggested_date: string;
  expires_at: string;
  status: "pending" | "accepted" | "declined" | "expired";
  score: number;
  match_reason: string | null;
  responded_at: string | null;
  matched_user?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  location?: {
    name: string;
    city: string | null;
  };
}

export function useMatchSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["match-suggestions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get suggestions where user is the recipient
      const { data, error } = await supabase
        .from("match_suggestions")
        .select(`
          *,
          locations!match_suggestions_location_id_fkey (
            name,
            city
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("score", { ascending: false });

      if (error) throw error;

      // Fetch matched user profiles separately
      const matchedUserIds = data?.map(s => s.matched_user_id) || [];
      if (matchedUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", matchedUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data?.map(s => ({
        ...s,
        matched_user: profileMap.get(s.matched_user_id) || null,
        location: s.locations,
      })) as MatchSuggestion[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  const respondMutation = useMutation({
    mutationFn: async ({ suggestionId, response }: { suggestionId: string; response: "accepted" | "declined" }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("match_suggestions")
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["match-suggestions", user?.id] });
      toast.success(
        variables.response === "accepted" 
          ? "Match akzeptiert! Du kannst jetzt eine Buchung starten." 
          : "Match abgelehnt"
      );
    },
    onError: (error: Error) => {
      console.error("Error responding to match:", error);
      toast.error("Fehler beim Antworten");
    },
  });

  return {
    suggestions,
    isLoading,
    respond: respondMutation.mutate,
    isResponding: respondMutation.isPending,
  };
}
