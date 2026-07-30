import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Article, ArticleAudience, NewsCategory } from "@/types/article";

/** URL-Slug aus einem Titel (Umlaute transliteriert, Rest zu Bindestrichen). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Admin list — includes drafts. */
export function useAdminArticles() {
  return useQuery({
    queryKey: ["admin-articles"],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await (supabase as any)
        .from("articles")
        .select("*, category:news_categories(id, name, name_en, slug, sort_order, is_active)")
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Article[];
    },
  });
}

export interface ArticleInput {
  id?: string;
  title: string;
  title_highlight: string;
  slug: string;
  excerpt: string;
  lead: string;
  body_html: string;
  cover_image_url: string;
  cover_alt: string;
  source_url: string;
  audience: ArticleAudience;
  category_id: string;
  is_featured: boolean;
  featured_rank: number;
  reading_minutes: number;
  location_id: string;
  cta_title: string;
  cta_subtitle: string;
  cta_label: string;
  cta_url: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
  sort_order: number;
  /** existing published_at of the row being edited — used to preserve first-publish timestamp */
  existingPublishedAt?: string | null;
}

/** Upload an image to the shared `media` bucket under news/, return its public URL. */
export async function uploadArticleImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `news/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-articles"] });
  qc.invalidateQueries({ queryKey: ["articles", "logged_in"] });
  qc.invalidateQueries({ queryKey: ["articles", "logged_out"] });
}

export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ArticleInput): Promise<string> => {
      const { data: userData } = await supabase.auth.getUser();

      // Stamp published_at the first time an article goes live; keep it thereafter.
      const publishedAt = data.is_published
        ? (data.existingPublishedAt ?? new Date().toISOString())
        : data.existingPublishedAt ?? null;

      const payload: Record<string, unknown> = {
        title: data.title,
        title_highlight: data.title_highlight || null,
        slug: data.slug.trim() || slugify(data.title),
        excerpt: data.excerpt || null,
        lead: data.lead || null,
        body_html: data.body_html,
        cover_image_url: data.cover_image_url || null,
        cover_alt: data.cover_alt || null,
        source_url: data.source_url || null,
        audience: data.audience,
        category_id: data.category_id || null,
        is_featured: data.is_featured,
        featured_rank: data.featured_rank,
        reading_minutes: data.reading_minutes || 3,
        location_id: data.location_id || null,
        cta_title: data.cta_title || null,
        cta_subtitle: data.cta_subtitle || null,
        cta_label: data.cta_label || null,
        cta_url: data.cta_url || null,
        seo_title: data.seo_title || null,
        seo_description: data.seo_description || null,
        is_published: data.is_published,
        published_at: publishedAt,
        sort_order: data.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        const { error } = await (supabase as any)
          .from("articles")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
        return data.id;
      } else {
        payload.created_by = userData.user?.id ?? null;
        const { data: inserted, error } = await (supabase as any)
          .from("articles")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return inserted.id as string;
      }
    },
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      toast.success(vars.id ? "Artikel aktualisiert" : "Artikel erstellt");
    },
    onError: (e: Error & { code?: string }) =>
      toast.error(
        e.code === "23505" || e.message?.includes("idx_articles_slug")
          ? "Slug bereits vergeben — bitte anpassen"
          : e.message || "Fehler beim Speichern",
      ),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Artikel gelöscht");
    },
    onError: (e: Error) => toast.error(e.message || "Fehler beim Löschen"),
  });
}

/**
 * Persistiert die per Drag-and-Drop gesetzte Reihenfolge: erste Karte bekommt
 * den höchsten sort_order (Feeds sortieren absteigend).
 */
export function useReorderArticles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          (supabase as any)
            .from("articles")
            .update({ sort_order: orderedIds.length - index })
            .eq("id", id),
        ),
      );
      const failed = results.find((r: { error?: Error }) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Reihenfolge gespeichert");
    },
    onError: (e: Error) => toast.error(e.message || "Fehler beim Sortieren"),
  });
}

// ── Kategorien ────────────────────────────────────────────────────────────────

/** Admin list — includes inactive categories. */
export function useAdminNewsCategories() {
  return useQuery({
    queryKey: ["admin-news-categories"],
    queryFn: async (): Promise<NewsCategory[]> => {
      const { data, error } = await (supabase as any)
        .from("news_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NewsCategory[];
    },
  });
}

export interface CategoryInput {
  id?: string;
  name: string;
  name_en: string;
  sort_order: number;
  is_active: boolean;
}

export function useSaveNewsCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInput) => {
      const payload = {
        name: data.name,
        name_en: data.name_en || null,
        slug: slugify(data.name),
        sort_order: data.sort_order,
        is_active: data.is_active,
      };
      if (data.id) {
        const { error } = await (supabase as any).from("news_categories").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("news_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news-categories"] });
      qc.invalidateQueries({ queryKey: ["news-categories"] });
      invalidateAll(qc);
    },
    onError: (e: Error & { code?: string }) =>
      toast.error(e.code === "23505" ? "Kategorie mit diesem Namen existiert bereits" : e.message),
  });
}

export function useDeleteNewsCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("news_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news-categories"] });
      qc.invalidateQueries({ queryKey: ["news-categories"] });
      invalidateAll(qc);
      toast.success("Kategorie gelöscht");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
