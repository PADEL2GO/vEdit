import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Section-Farbwelten (Colorways) — zentral gesteuert über site_visuals
 * (Keys app.theme.*, Hex im Feld image_url). Dieselben Zeilen steuern die App:
 * Website-Admin und App-Admin pflegen exakt denselben Datensatz.
 * Leerer Wert → Code-Standard aus SECTION_THEME_DEFAULTS.
 */
export const SECTION_THEME_DEFAULTS = {
  home: "#C7F011",    // Mein P2G — Lime (Brand)
  booking: "#2F7BFF", // Buchen — Electric Blau
  events: "#A855F7",  // Events — Violett
  news: "#C7F011",    // News — Lime (Topic-System übernimmt innerhalb der Section)
  market: "#FF8A00",  // Marketplace — Orange
  profile: "#9AA3AE", // Profil — Stahlgrau
  admin: "#F43F5E",   // Admin — Signal-Rot
} as const;

export type SectionKey = keyof typeof SECTION_THEME_DEFAULTS;

export const SECTION_LABELS: Record<SectionKey, string> = {
  home: "Mein P2G",
  booking: "Buchen",
  events: "Events",
  news: "News",
  market: "Marketplace",
  profile: "Profil",
  admin: "Admin",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Alle Section-Farben (Admin-Werte mit Code-Fallback). */
export function useSectionThemes(): Record<SectionKey, string> {
  const { data } = useQuery({
    queryKey: ["section-themes"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await (supabase as any)
        .from("site_visuals")
        .select("key, image_url")
        .like("key", "app.theme.%");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const value = (row.image_url ?? "").trim();
        if (HEX_RE.test(value)) map[row.key.replace("app.theme.", "")] = value;
      }
      return map;
    },
  });
  return { ...SECTION_THEME_DEFAULTS, ...(data ?? {}) };
}

export function useSectionTheme(section: SectionKey): string {
  return useSectionThemes()[section];
}

function hexToHslString(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * CSS-Variablen für eine Section: die --acc-Familie (wie News-Colorway) PLUS
 * ein Override von --primary, damit alles, was bisher Lime war (text-primary,
 * bg-primary, Borders, Badges, Buttons), automatisch in der Section-Farbe rendert.
 */
export function sectionThemeVars(color: string): CSSProperties {
  return {
    "--acc": color,
    "--acc-bg": `${color}1F`,
    "--acc-brd": `${color}66`,
    "--acc-glow": `${color}26`,
    "--primary": hexToHslString(color),
  } as CSSProperties;
}
