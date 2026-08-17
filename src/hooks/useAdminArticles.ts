import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadMediaFile } from "@/lib/uploadMedia";
import type { Article, ArticleAudience, NewsAuthor } from "@/types/article";

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
        .select("*")
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
  topic: string;
  is_featured: boolean;
  featured_rank: number;
  reading_minutes: number;
  location_id: string;
  author_id: string;
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
  /**
   * Manuell geänderte EN-Felder (title_en, …, jeweils + _en_locked) — nur die
   * tatsächlich geänderten, damit unangetastete DeepL-Werte erhalten bleiben.
   */
  enUpdates?: Record<string, string | boolean | null>;
}

/** Upload an image to the shared `media` bucket under news/, return its public URL. */
export async function uploadArticleImage(file: File): Promise<string> {
  return uploadMediaFile(file, `news/${crypto.randomUUID()}`);
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
        topic: data.topic || "Inside P2G",
        is_featured: data.is_featured,
        featured_rank: data.featured_rank,
        reading_minutes: data.reading_minutes || 3,
        location_id: data.location_id || null,
        author_id: data.author_id || null,
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
        ...(data.enUpdates ?? {}),
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

/** Schnell-Toggle Entwurf ↔ Live aus der Liste; stempelt published_at beim ersten Publish. */
export function usePublishArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish, publishedAt }: { id: string; publish: boolean; publishedAt: string | null }) => {
      const { error } = await (supabase as any)
        .from("articles")
        .update({
          is_published: publish,
          published_at: publish ? (publishedAt ?? new Date().toISOString()) : publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      toast.success(vars.publish ? "Artikel ist live" : "Artikel auf Entwurf gesetzt");
    },
    onError: (e: Error) => toast.error(e.message || "Fehler beim Umschalten"),
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


// ── Autoren ──────────────────────────────────────────────────────────────────

export function useAdminNewsAuthors() {
  return useQuery({
    queryKey: ["news-authors"],
    queryFn: async (): Promise<NewsAuthor[]> => {
      const { data, error } = await (supabase as any).from("news_authors").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as NewsAuthor[];
    },
  });
}

export interface AuthorInput {
  id?: string;
  name: string;
  role: string;
  role_en: string;
  avatar_url: string;
}

export function useSaveNewsAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AuthorInput) => {
      const payload = {
        name: data.name,
        role: data.role || null,
        role_en: data.role_en || null,
        avatar_url: data.avatar_url || null,
      };
      if (data.id) {
        const { error } = await (supabase as any).from("news_authors").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("news_authors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news-authors"] });
      invalidateAll(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteNewsAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("news_authors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news-authors"] });
      invalidateAll(qc);
      toast.success("Autor gelöscht");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
