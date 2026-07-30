import type { CSSProperties } from "react";

export type ArticleAudience = "logged_in" | "logged_out" | "everyone";

// ── Topic-Colorcode-System ────────────────────────────────────────────────────
// Der Topic-String ist der Schlüssel (kommt exakt so aus dem Backend);
// die Farbzuordnung lebt nur hier im Frontend. „Alle" ist kein Topic,
// sondern der Filter-Default (Brand-Lime).
export const TOPIC_COLORS = {
  "Alle": "#C7F011",
  "Inside P2G": "#C7F011",
  "Events": "#B06BFF",
  "Marketplace": "#FF8A1F",
  "Community": "#FF4D4D",
  "Business": "#2FE0C0",
} as const;

export type Topic = Exclude<keyof typeof TOPIC_COLORS, "Alle">;

export const TOPICS: Topic[] = ["Inside P2G", "Events", "Marketplace", "Community", "Business"];

/** Volltonfarbe eines Topics — unbekannte Werte fallen auf Inside P2G zurück. */
export function topicColor(topic: string | null | undefined): string {
  return TOPIC_COLORS[topic as keyof typeof TOPIC_COLORS] ?? TOPIC_COLORS["Inside P2G"];
}

/**
 * Akzent als CSS Custom Properties für einen Seiten-Root.
 * Abgeleitete Alphas per 8-stelligem Hex: bg 12%, border 40%, glow 15%.
 */
export function accentVars(color: string): CSSProperties {
  return {
    "--acc": color,
    "--acc-bg": `${color}1F`,
    "--acc-brd": `${color}66`,
    "--acc-glow": `${color}26`,
  } as CSSProperties;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  title_highlight: string | null;
  excerpt: string | null;
  lead: string | null;
  body_html: string;
  cover_image_url: string | null;
  cover_alt: string | null;
  source_url: string | null;
  audience: ArticleAudience;
  topic: Topic | string;
  is_featured: boolean;
  featured_rank: number;
  reading_minutes: number;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  location_id: string | null;
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  ai_generated?: boolean;
  like_count: number;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const AUDIENCE_LABELS: Record<ArticleAudience, string> = {
  everyone: "Alle",
  logged_in: "Nur eingeloggte Nutzer",
  logged_out: "Nur Besucher (nicht eingeloggt)",
};
