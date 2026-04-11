import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  primary_contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubCourtAssignment {
  id: string;
  club_id: string;
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

export interface ClubMembership {
  id: string;
  club_id: string;
  user_id: string;
  role_in_club: 'manager' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClubAuth() {
  const { user } = useAuth();

  // Check club_users membership (new model)
  const { data: clubMembership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ["club-user-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("club_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking club membership:", error);
        return null;
      }
      
      return data as ClubMembership | null;
    },
    enabled: !!user?.id,
  });

  // Fallback: Check legacy club_owner role
  const { data: isLegacyClubOwner, isLoading: isLoadingLegacy } = useQuery({
    queryKey: ["user-role-club-owner-legacy", user?.id],
    queryFn: async () => {
      if (!user?.id || clubMembership) return false;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "club_owner")
        .maybeSingle();
      
      if (error) {
        console.error("Error checking legacy club owner role:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id && !clubMembership,
  });

  // Fetch club data
  const { data: club, isLoading: isLoadingClub } = useQuery({
    queryKey: ["club-data", clubMembership?.club_id],
    queryFn: async () => {
      if (!clubMembership?.club_id) return null;
      
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubMembership.club_id)
        .single();
      
      if (error) {
        console.error("Error fetching club:", error);
        return null;
      }
      
      return data as Club;
    },
    enabled: !!clubMembership?.club_id,
  });

  // Fetch court assignments for the club (new model)
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["club-court-assignments", clubMembership?.club_id],
    queryFn: async () => {
      if (!clubMembership?.club_id) return [];
      
      const { data, error } = await supabase
        .from("club_court_assignments")
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
        .eq("club_id", clubMembership.club_id);
      
      if (error) {
        console.error("Error fetching club court assignments:", error);
        return [];
      }
      
      return data as unknown as ClubCourtAssignment[];
    },
    enabled: !!clubMembership?.club_id,
  });

  // Fallback: Fetch legacy club_owner_assignments
  const { data: legacyAssignments, isLoading: isLoadingLegacyAssignments } = useQuery({
    queryKey: ["club-owner-assignments-legacy", user?.id],
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
        console.error("Error fetching legacy club owner assignments:", error);
        return [];
      }
      
      // Map to ClubCourtAssignment structure
      return data.map((a: any) => ({
        ...a,
        club_id: null, // Legacy assignments don't have club_id
      })) as ClubCourtAssignment[];
    },
    enabled: !!user?.id && !clubMembership && isLegacyClubOwner === true,
  });

  // Determine effective values
  const isClubUser = !!clubMembership || isLegacyClubOwner === true;
  const effectiveAssignments = clubMembership ? (assignments ?? []) : (legacyAssignments ?? []);
  const primaryAssignment = effectiveAssignments[0] ?? null;
  const roleInClub = clubMembership?.role_in_club ?? (isLegacyClubOwner ? 'manager' : null);

  const isLoading = 
    isLoadingMembership || 
    isLoadingLegacy || 
    isLoadingClub || 
    isLoadingAssignments || 
    isLoadingLegacyAssignments;

  return {
    isClubUser,
    isLoading,
    club,
    clubId: clubMembership?.club_id ?? null,
    roleInClub,
    isManager: roleInClub === 'manager',
    isStaff: roleInClub === 'staff',
    assignments: effectiveAssignments,
    primaryAssignment,
    courtId: primaryAssignment?.court_id ?? null,
    courtName: primaryAssignment?.court?.name ?? null,
    locationName: primaryAssignment?.court?.location?.name ?? null,
  };
}
