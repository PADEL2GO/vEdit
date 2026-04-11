import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ClubOwnerAssignment {
  id: string;
  user_id: string;
  court_id: string;
  monthly_free_minutes: number;
  allowed_booking_windows: Record<string, { start: string; end: string }[]> | null;
  created_at: string;
  updated_at: string;
  court?: {
    id: string;
    name: string;
    location_id: string;
    location?: {
      id: string;
      name: string;
      city: string | null;
    };
  };
}

export function useClubOwnerAuth() {
  const { user } = useAuth();

  const { data: isClubOwner, isLoading: isLoadingRole } = useQuery({
    queryKey: ["user-role-club-owner", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "club_owner")
        .maybeSingle();
      
      if (error) {
        console.error("Error checking club owner role:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["club-owner-assignments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("club_owner_assignments")
        .select(`
          *,
          court:courts (
            id,
            name,
            location_id,
            location:locations (
              id,
              name,
              city
            )
          )
        `)
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching club owner assignments:", error);
        return [];
      }
      
      return data as unknown as ClubOwnerAssignment[];
    },
    enabled: !!user?.id && isClubOwner === true,
  });

  // Get primary assignment (first one)
  const primaryAssignment = assignments?.[0] ?? null;

  return {
    isClubOwner: isClubOwner ?? false,
    isLoading: isLoadingRole || isLoadingAssignments,
    assignments: assignments ?? [],
    primaryAssignment,
    courtId: primaryAssignment?.court_id ?? null,
    courtName: primaryAssignment?.court?.name ?? null,
    locationName: primaryAssignment?.court?.location?.name ?? null,
  };
}
