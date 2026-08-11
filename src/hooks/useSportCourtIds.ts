import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SportScope } from "@/components/admin/SportScopeTabs";

/**
 * Court-IDs einer Sportart — die Brücke zwischen dem Sport-Umschalter und den
 * vielen Auswertungs-Queries.
 *
 * Hintergrund: `bookings` trägt nur `court_id`/`location_id`, keine Sportart.
 * Statt jede Query um ein Subselect auf `courts` zu erweitern (PostgREST kann
 * das nicht direkt), holen wir die IDs einmal und filtern mit `.in()`.
 *
 * Rückgabe `null` = „nicht einschränken" (Scope „Konsolidiert"). Aufrufer:
 *   const { data: courtIds } = useSportCourtIds(scope);
 *   if (courtIds) query = query.in("court_id", courtIds);
 *
 * Wichtig: Ein LEERES Array bedeutet „diese Sportart hat keine Courts" — dann
 * muss die Query auch wirklich 0 Treffer liefern, nicht etwa alle.
 */
export function useSportCourtIds(scope: SportScope) {
  return useQuery({
    queryKey: ["sport-court-ids", scope],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[] | null> => {
      if (scope === "all") return null;
      const { data, error } = await (supabase as any)
        .from("courts")
        .select("id")
        .eq("sport", scope);
      if (error) throw error;
      return ((data ?? []) as { id: string }[]).map((c) => c.id);
    },
  });
}
