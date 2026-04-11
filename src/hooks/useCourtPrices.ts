import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS, createQueryKey } from "@/lib/queryKeys";

export interface CourtPrice {
  id: string;
  court_id: string | null;
  duration_minutes: number;
  price_cents: number;
}

/**
 * Fetch global fallback prices (court_id = null)
 */
export function useGlobalPrices() {
  return useQuery({
    queryKey: [QUERY_KEYS.globalPrices],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_prices")
        .select("*")
        .is("court_id", null)
        .order("duration_minutes");

      if (error) throw error;
      return data as CourtPrice[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch prices for a specific court (court-specific only)
 */
export function useCourtSpecificPrices(courtId: string | null) {
  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.courtPrices, courtId),
    queryFn: async () => {
      if (!courtId) return [];
      const { data, error } = await supabase
        .from("court_prices")
        .select("*")
        .eq("court_id", courtId)
        .order("duration_minutes");

      if (error) throw error;
      return data as CourtPrice[];
    },
    enabled: !!courtId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch prices for a court with fallback to global prices
 */
export function useCourtPricesWithFallback(courtId: string | null) {
  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.courtPricesWithFallback, courtId),
    queryFn: async () => {
      if (!courtId) return [];

      // First try court-specific prices
      const { data: courtPrices, error: courtError } = await supabase
        .from("court_prices")
        .select("*")
        .eq("court_id", courtId)
        .order("duration_minutes");

      if (courtError) throw courtError;

      if (courtPrices && courtPrices.length > 0) {
        return courtPrices as CourtPrice[];
      }

      // Fallback to global prices
      const { data: globalPrices, error: globalError } = await supabase
        .from("court_prices")
        .select("*")
        .is("court_id", null)
        .order("duration_minutes");

      if (globalError) throw globalError;
      return (globalPrices || []) as CourtPrice[];
    },
    enabled: !!courtId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the minimum price (60 min) for a location across all courts
 * Falls back to global price if no court-specific prices exist
 */
export function useLocationMinPrice(locationId: string | null) {
  return useQuery({
    queryKey: createQueryKey(QUERY_KEYS.locationMinPrice, locationId),
    queryFn: async () => {
      if (!locationId) return null;

      // Get all courts for this location
      const { data: courts, error: courtsError } = await supabase
        .from("courts")
        .select("id")
        .eq("location_id", locationId)
        .eq("is_active", true);

      if (courtsError) throw courtsError;

      const courtIds = courts?.map(c => c.id) || [];

      if (courtIds.length > 0) {
        // Try to find court-specific prices for 60 min
        const { data: courtPrices, error: pricesError } = await supabase
          .from("court_prices")
          .select("price_cents")
          .in("court_id", courtIds)
          .eq("duration_minutes", 60)
          .order("price_cents", { ascending: true })
          .limit(1);

        if (pricesError) throw pricesError;

        if (courtPrices && courtPrices.length > 0) {
          return courtPrices[0].price_cents;
        }
      }

      // Fallback to global 60 min price
      const { data: globalPrice, error: globalError } = await supabase
        .from("court_prices")
        .select("price_cents")
        .is("court_id", null)
        .eq("duration_minutes", 60)
        .maybeSingle();

      if (globalError) throw globalError;
      return globalPrice?.price_cents ?? null;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Upsert prices for a court (all 3 durations)
 */
export function useUpsertCourtPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prices: Array<{ court_id: string; duration_minutes: number; price_cents: number }>) => {
      // Delete existing prices for this court first, then insert new ones
      const courtId = prices[0]?.court_id;
      if (!courtId) throw new Error("No court_id provided");

      const { error: deleteError } = await supabase
        .from("court_prices")
        .delete()
        .eq("court_id", courtId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("court_prices")
        .insert(prices);

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      const courtId = variables[0]?.court_id;
      queryClient.invalidateQueries({ queryKey: createQueryKey(QUERY_KEYS.courtPrices, courtId) });
      queryClient.invalidateQueries({ queryKey: createQueryKey(QUERY_KEYS.courtPricesWithFallback, courtId) });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.locationMinPrice] });
      toast.success("Preise gespeichert");
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Speichern", { description: error.message });
    },
  });
}

/**
 * Get price for a specific duration from a list of court prices
 */
export function getPriceFromList(prices: CourtPrice[] | undefined, durationMinutes: number): number | null {
  if (!prices || prices.length === 0) {
    return null; // No prices configured
  }
  const price = prices.find(p => p.duration_minutes === durationMinutes);
  return price?.price_cents ?? null;
}
