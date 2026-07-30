export type ArticleAudience = "logged_in" | "logged_out" | "everyone";

export interface NewsCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
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
  category_id: string | null;
  category?: NewsCategory | null;
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

/** Kategoriename in der aktiven Sprache (EN fällt auf DE zurück). */
export function categoryLabel(cat: NewsCategory | null | undefined, lang: string): string {
  if (!cat) return "";
  return lang.startsWith("en") && cat.name_en ? cat.name_en : cat.name;
}
