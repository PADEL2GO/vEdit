import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format } from "date-fns";

interface QuotaLedgerEntry {
  id: string;
  club_owner_id: string;
  club_id: string | null;
  court_id: string;
  month_start_date: string;
  minutes_used: number;
  minutes_refunded: number;
  booking_id: string | null;
  created_at: string;
}

interface QuotaSummary {
  monthlyAllowance: number;
  minutesUsed: number;
  minutesRefunded: number;
  remainingMinutes: number;
  monthStartDate: string;
  percentUsed: number;
}

/**
 * Hook for fetching club quota usage (monthly)
 * @param clubId - The club ID (new model) - takes precedence
 * @param courtId - The court ID
 * @param monthlyFreeMinutes - Monthly free minutes allowance
 * @param legacyUserId - Legacy user ID for club_owner_id queries (deprecated)
 */
export function useClubQuota(
  clubId: string | null,
  courtId: string | null, 
  monthlyFreeMinutes: number = 2400, 
  legacyUserId?: string | null
) {
  const monthStart = startOfMonth(new Date());
  const monthStartStr = format(monthStart, "yyyy-MM-dd");

  const { data: ledgerEntries, isLoading, refetch } = useQuery({
    queryKey: ["club-quota-ledger", clubId, legacyUserId, courtId, monthStartStr],
    queryFn: async () => {
      if (!courtId) return [];
      
      // If we have clubId, use that (new model)
      if (clubId) {
        const { data, error } = await supabase
          .from("club_quota_ledger")
          .select("*")
          .eq("club_id", clubId)
          .eq("court_id", courtId)
          .eq("month_start_date", monthStartStr);
        
        if (error) {
          console.error("Error fetching quota ledger:", error);
          return [];
        }
        
        return data as unknown as QuotaLedgerEntry[];
      }
      
      // Fallback: legacy club_owner_id query
      if (legacyUserId) {
        const { data, error } = await supabase
          .from("club_quota_ledger")
          .select("*")
          .eq("club_owner_id", legacyUserId)
          .eq("court_id", courtId)
          .eq("month_start_date", monthStartStr);
        
        if (error) {
          console.error("Error fetching quota ledger (legacy):", error);
          return [];
        }
        
        return data as unknown as QuotaLedgerEntry[];
      }
      
      return [];
    },
    enabled: !!courtId && (!!clubId || !!legacyUserId),
  });

  // Calculate summary
  const summary: QuotaSummary = {
    monthlyAllowance: monthlyFreeMinutes,
    minutesUsed: 0,
    minutesRefunded: 0,
    remainingMinutes: monthlyFreeMinutes,
    monthStartDate: monthStartStr,
    percentUsed: 0,
  };

  if (ledgerEntries && ledgerEntries.length > 0) {
    summary.minutesUsed = ledgerEntries.reduce((sum, entry) => sum + entry.minutes_used, 0);
    summary.minutesRefunded = ledgerEntries.reduce((sum, entry) => sum + entry.minutes_refunded, 0);
    summary.remainingMinutes = monthlyFreeMinutes - summary.minutesUsed + summary.minutesRefunded;
    summary.percentUsed = Math.round(((summary.minutesUsed - summary.minutesRefunded) / monthlyFreeMinutes) * 100);
  }

  // Format remaining time as hours and minutes
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? "-" : "";
    if (hours === 0) return `${sign}${mins}min`;
    if (mins === 0) return `${sign}${hours}h`;
    return `${sign}${hours}h ${mins}min`;
  };

  return {
    isLoading,
    summary,
    ledgerEntries: ledgerEntries ?? [],
    remainingFormatted: formatMinutes(summary.remainingMinutes),
    allowanceFormatted: formatMinutes(monthlyFreeMinutes),
    hasQuotaAvailable: summary.remainingMinutes > 0,
    refetch,
  };
}
