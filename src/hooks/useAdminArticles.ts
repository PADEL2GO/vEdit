import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Article, ArticleAudience } from "@/types/article";

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
  excerpt: string;
  body_html: string;
  cover_image_url: string;
  source_url: string;
  audience: ArticleAudience;
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
        excerpt: data.excerpt || null,
        body_html: data.body_html,
        cover_image_url: data.cover_image_url || null,
        source_url: data.source_url || null,
        audience: data.audience,
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
    onError: (e: Error) => toast.error(e.message || "Fehler beim Speichern"),
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
