import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MyClubMembership {
  clubId: string;
  clubName: string;
  homeMode: "discount" | "fixed";
  homeDiscountCents: number;
  awayDiscountCents: number;
  /** null = unbegrenzt */
  monthlyDiscountLimit: number | null;
  discountUsedMonth: number;
  quotaEnabled: boolean;
}

export interface MemberQuotaSummary {
  clubId: string;
  clubName: string;
  quotaEnabled: boolean;
  /** Rest des Vereinskontingents auf DIESEM Court */
  clubRemaining: number;
  /** Persönlicher Rest über alle Courts des Vereins */
  memberRemaining: number;
}

/**
 * Vereinsmitgliedschaft des angemeldeten Nutzers — Verein, Konditionen und der
 * Rest des Monatslimits. `null` = kein Mitglied.
 */
export function useMyClubMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-club-membership", user?.id],
    queryFn: async (): Promise<MyClubMembership | null> => {
      const { data, error } = await (supabase as any).rpc("my_club_membership");
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      return {
        clubId: row.club_id,
        clubName: row.club_name,
        homeMode: row.home_mode === "fixed" ? "fixed" : "discount",
        homeDiscountCents: Number(row.home_discount_cents ?? 0) || 0,
        awayDiscountCents: Number(row.away_discount_cents ?? 0) || 0,
        monthlyDiscountLimit:
          row.monthly_discount_limit === null || row.monthly_discount_limit === undefined
            ? null
            : Number(row.monthly_discount_limit),
        discountUsedMonth: Number(row.discount_used_month ?? 0) || 0,
        quotaEnabled: row.quota_enabled === true,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Freikontingent-Rest für genau diesen Court und Monat. Liefert `null`, wenn der
 * Nutzer kein Mitglied ist; `quotaEnabled: false`, wenn der Verein das Kontingent
 * nicht für Mitglieder freigegeben hat oder der Court nicht zum Verein gehört.
 */
export function useMemberQuota(courtId: string | null, startTime: string | Date | null) {
  const { user } = useAuth();
  const startIso = startTime
    ? (startTime instanceof Date ? startTime : new Date(startTime)).toISOString()
    : null;

  return useQuery({
    queryKey: ["member-quota", user?.id, courtId, startIso],
    queryFn: async (): Promise<MemberQuotaSummary | null> => {
      const { data, error } = await (supabase as any).rpc("member_quota_summary", {
        p_court_id: courtId,
        p_start: startIso,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      return {
        clubId: row.club_id,
        clubName: row.club_name,
        quotaEnabled: row.quota_enabled === true,
        clubRemaining: Number(row.club_remaining ?? 0) || 0,
        memberRemaining: Number(row.member_remaining ?? 0) || 0,
      };
    },
    enabled: !!user?.id && !!courtId && !!startIso,
    staleTime: 60 * 1000,
  });
}

/**
 * Offene Einladungen des Vereins einlösen. Wird einmal je Session nach dem Login
 * aufgerufen — damit greift eine Einladung sowohl für bestehende Konten als auch
 * für Nutzer, die sich erst nach der Einladung registrieren.
 */
export async function claimClubMemberInvites(): Promise<number> {
  const { data, error } = await (supabase as any).rpc("claim_club_member_invites");
  if (error) {
    console.warn("Einladungen konnten nicht geprüft werden:", error.message);
    return 0;
  }
  return Number(data ?? 0) || 0;
}

/** Nach einer Kontingent-Buchung müssen Mitgliedschaft und Restminuten neu geladen werden. */
export function useInvalidateMembership() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["my-club-membership"] });
    queryClient.invalidateQueries({ queryKey: ["member-quota"] });
  };
}
