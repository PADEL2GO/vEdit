import { useMemo } from "react";
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

// Noch nicht in queryKeys.ts gepflegt — bewusst lokal gehalten.
const BOOKING_RATES_QUERY_KEY = "booking-rates";
const COURT_MIN_PRICE_QUERY_KEY = "court-min-price";

/**
 * Fetch global fallback prices (court_id = null)
 *
 * Altlast: `court_prices.court_id` ist seit Migration 20251219134814 NOT NULL —
 * diese Abfrage kann nie treffen. Die "global"-Rolle übernehmen jetzt Bänder
 * mit `court_id IS NULL` (siehe useResolvedBookingRates / useCourtMinPrice).
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

/**
 * Preis + Punkte-Faktor eines Slots, aufgelöst durch die Datenbank
 * (Zeitfenster-Band schlägt court_prices, sonst heutiges Verhalten).
 */
export interface ResolvedBookingRate {
  /** Startzeitpunkt wie von der DB zurückgegeben (ISO). */
  startTime: string;
  /** null = weder Band noch court_prices liefern einen Preis. */
  priceCents: number | null;
  /** 1 = kein Punkte-Band aktiv. */
  pointsMultiplier: number;
  priceBandName: string | null;
  pointsBandName: string | null;
}

interface RawBookingRateRow {
  start_time: string;
  price_cents: number | null;
  points_multiplier: number | string | null;
  price_band_name: string | null;
  points_band_name: string | null;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function localDateKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Löst Preis + Punkte-Faktor für ALLE Slots eines Tages in EINEM Request auf
 * (RPC `resolve_booking_rates_batch`). Die Bandlogik bleibt in der Datenbank,
 * damit Anzeige und Checkout nicht auseinanderlaufen.
 */
export function useResolvedBookingRates({
  courtId,
  startTimes,
  durationMinutes,
}: {
  courtId: string | null;
  /** Startzeitpunkte aller Slots des angezeigten Tages. */
  startTimes: Array<string | Date>;
  durationMinutes: number;
}) {
  const startIsos = useMemo(() => startTimes.map(toIso), [startTimes]);
  const dateKey = startIsos.length > 0 ? localDateKey(startIsos[0]) : null;

  const query = useQuery({
    queryKey: [BOOKING_RATES_QUERY_KEY, courtId, dateKey, durationMinutes],
    queryFn: async (): Promise<ResolvedBookingRate[]> => {
      const { data, error } = await (supabase as any).rpc("resolve_booking_rates_batch", {
        p_court_id: courtId,
        p_starts: startIsos,
        p_duration_minutes: durationMinutes,
      });

      if (error) throw error;

      return ((data ?? []) as RawBookingRateRow[]).map((row) => ({
        startTime: row.start_time,
        priceCents: row.price_cents ?? null,
        // Kein `|| 1`: ein Band mit Multiplikator 0 (= keine Punkte) ist erlaubt und
        // wuerde davon faelschlich zu x1. Gleiche Pruefung wie in den Edge Functions.
        pointsMultiplier: (() => {
          const raw = Number(row.points_multiplier ?? 1);
          return Number.isFinite(raw) && raw >= 0 ? raw : 1;
        })(),
        priceBandName: row.price_band_name,
        pointsBandName: row.points_band_name,
      }));
    },
    enabled: !!courtId && startIsos.length > 0 && durationMinutes > 0,
    staleTime: 5 * 60 * 1000,
  });

  /** Lookup über den Zeitstempel — String-Vergleich scheitert an DB-Formatierung. */
  const ratesByStart = useMemo(() => {
    const map = new Map<number, ResolvedBookingRate>();
    for (const rate of query.data ?? []) {
      map.set(new Date(rate.startTime).getTime(), rate);
    }
    return map;
  }, [query.data]);

  return {
    rates: query.data,
    ratesByStart,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

/**
 * Rate eines einzelnen Slots aus dem Ergebnis von `useResolvedBookingRates`.
 * `undefined` = noch nicht geladen -> Aufrufer bleibt beim bisherigen Preis.
 */
export function getRateForStart(
  ratesByStart: Map<number, ResolvedBookingRate>,
  start: string | Date,
): ResolvedBookingRate | undefined {
  return ratesByStart.get(new Date(start).getTime());
}

/** "2" bzw. "1,5" — de-DE, ohne überflüssige Nachkommastellen. */
export function formatPointsMultiplier(multiplier: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(multiplier);
}

/**
 * Günstigster Preis eines Courts über alle Dauern UND aktiven Bänder
 * (RPC `court_min_price_cents`) — hält die "ab X €"-Anzeige ehrlich.
 */
export function useCourtMinPrice(courtId: string | null) {
  return useQuery({
    queryKey: [COURT_MIN_PRICE_QUERY_KEY, courtId],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await (supabase as any).rpc("court_min_price_cents", {
        p_court_id: courtId,
      });

      if (error) throw error;
      return (data as number | null) ?? null;
    },
    enabled: !!courtId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Günstigster Preis über alle Courts eines Standorts, inkl. Bänder.
 * Liefert die RPC nichts, greift das bisherige Verhalten (günstigster
 * 60-Minuten-Preis aus court_prices) statt einer leeren Anzeige.
 */
export async function fetchLocationMinPriceCents(courtIds: string[]): Promise<number | null> {
  if (courtIds.length === 0) return null;

  const results = await Promise.all(
    courtIds.map(async (courtId) => {
      const { data, error } = await (supabase as any).rpc("court_min_price_cents", {
        p_court_id: courtId,
      });
      if (error) return null;
      return (data as number | null) ?? null;
    }),
  );

  const bandAware = results.filter((p): p is number => p !== null);
  if (bandAware.length > 0) {
    return Math.min(...bandAware);
  }

  const { data: courtPrices } = await supabase
    .from("court_prices")
    .select("price_cents")
    .in("court_id", courtIds)
    .eq("duration_minutes", 60)
    .order("price_cents", { ascending: true })
    .limit(1);

  return courtPrices?.[0]?.price_cents ?? null;
}
