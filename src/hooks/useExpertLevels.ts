import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXPERT_LEVELS, getExpertLevelEmoji } from "@/lib/expertLevels";

/**
 * Admin-konfigurierbare Expert-Levels aus `expert_levels_config` (Single Source of Truth).
 * Fällt auf die lib-Defaults zurück, falls die DB leer/nicht erreichbar ist (Offline-Parität).
 * Das Level richtet sich nach den insgesamt verdienten Punkten (lifetime_credits).
 */
export interface DbExpertLevel {
  id: number;
  name: string;
  min_points: number;
  max_points: number | null;
  sort_order: number;
  gradient: string | null;
  emoji: string | null;
  description: string | null;
  perks: string[] | null;
  multiplier: number;
}

const FALLBACK: DbExpertLevel[] = EXPERT_LEVELS.map((l, i) => ({
  id: i + 1,
  name: l.name,
  min_points: l.minPoints,
  max_points: l.maxPoints === Infinity ? null : l.maxPoints,
  sort_order: i + 1,
  gradient: l.gradient,
  emoji: getExpertLevelEmoji(l.name),
  description: null,
  perks: null,
  multiplier: 1,
}));

export function useExpertLevels() {
  const { data, isLoading } = useQuery({
    queryKey: ["expert-levels-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_levels_config")
        .select("*")
        .order("min_points", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DbExpertLevel[];
    },
    staleTime: 60_000,
  });

  const levels = data && data.length > 0 ? data : FALLBACK;
  return { levels, isLoading };
}

// ── Pure helpers (take the levels list + a point total) ──────────────────────
export function levelForPoints(levels: DbExpertLevel[], points: number): DbExpertLevel {
  const sorted = [...levels].sort((a, b) => a.min_points - b.min_points);
  let current = sorted[0] ?? FALLBACK[0];
  for (const l of sorted) if (points >= l.min_points) current = l;
  return current;
}

export function nextLevelForPoints(levels: DbExpertLevel[], points: number): DbExpertLevel | null {
  const sorted = [...levels].sort((a, b) => a.min_points - b.min_points);
  return sorted.find((l) => l.min_points > points) ?? null;
}

export function progressToNext(levels: DbExpertLevel[], points: number): number {
  const cur = levelForPoints(levels, points);
  const next = nextLevelForPoints(levels, points);
  if (!next) return 100;
  const span = next.min_points - cur.min_points;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((points - cur.min_points) / span) * 100));
}
