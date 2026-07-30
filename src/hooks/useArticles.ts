import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Article } from "@/types/article";

const ARTICLE_SELECT = "*, author:news_authors(id, name, role, role_en, avatar_url)";

/**
 * Public read hook for the news feed.
 * `surface` "logged_in" → dashboard Übersicht, "logged_out" → public home.
 * Returns published articles targeted at that surface plus "everyone" articles.
 */
export function useArticles(surface: "logged_in" | "logged_out") {
  return useQuery({
    queryKey: ["articles", surface],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await (supabase as any)
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("is_published", true)
        .in("audience", [surface, "everyone"])
        .order("sort_order", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Article[];
    },
  });
}

/** Single published article by slug — for /news/:slug. */
export function useArticleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["article", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Article | null> => {
      const { data, error } = await (supabase as any)
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Article) ?? null;
    },
  });
}

/** Up to 4 newest published articles from the same category, excluding the article itself. */
export function useRelatedArticles(article: Article | null | undefined) {
  return useQuery({
    queryKey: ["related-articles", article?.id],
    enabled: !!article,
    queryFn: async (): Promise<Article[]> => {
      let query = (supabase as any)
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("is_published", true)
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(4);
      if (article!.topic) query = query.eq("topic", article!.topic);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Article[];
    },
  });
}

/** Location shown in the article sidebar. */
export function useArticleLocation(locationId: string | null | undefined) {
  return useQuery({
    queryKey: ["article-location", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, address, postal_code, city")
        .eq("id", locationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

const LIKED_KEY = "p2g.news.liked";

const readLiked = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]");
  } catch {
    return [];
  }
};

/** Eigene Likes des eingeloggten Users — RLS liefert nur die eigenen Zeilen. */
function useMyNewsLikes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-news-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any).from("news_likes").select("article_id");
      if (error) throw error;
      return (data ?? []).map((r: { article_id: string }) => r.article_id);
    },
  });
}

/**
 * Like-Toggle über die Edge Function news-like (1× pro User bzw. IP, serverseitig
 * erzwungen). Eingeloggt kommt der Button-Zustand aus der DB (geräteübergreifend),
 * für Gäste spiegelt localStorage den Zustand dieses Geräts.
 */
export function useArticleLike(article: Article | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: myLikes } = useMyNewsLikes();
  const [pending, setPending] = useState(false);
  const [localLiked, setLocalLiked] = useState<boolean | null>(null);
  const [localCount, setLocalCount] = useState<number | null>(null);

  const liked =
    localLiked ??
    (article
      ? user
        ? (myLikes ?? []).includes(article.id)
        : readLiked().includes(article.id)
      : false);
  const likeCount = localCount ?? article?.like_count ?? 0;

  const toggle = async () => {
    if (!article || pending) return;
    setPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("news-like", {
        body: { article_id: article.id },
      });
      if (error) throw error;
      const result = data as { liked: boolean; like_count: number };
      setLocalLiked(result.liked);
      setLocalCount(result.like_count);
      const ids = readLiked().filter((id) => id !== article.id);
      if (result.liked) ids.push(article.id);
      try {
        localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
      queryClient.invalidateQueries({ queryKey: ["article", article.slug] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["my-news-likes"] });
    } finally {
      setPending(false);
    }
  };

  return { liked, likeCount, toggle, pending };
}

const VIEWED_KEY = "p2g.news.viewed";

/** Zählt einen View — höchstens einmal pro Browser-Session und Artikel. */
export async function trackArticleView(slug: string) {
  try {
    const viewed: string[] = JSON.parse(sessionStorage.getItem(VIEWED_KEY) ?? "[]");
    if (viewed.includes(slug)) return;
    viewed.push(slug);
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  } catch {
    /* Storage blockiert → trotzdem zählen */
  }
  await (supabase as any).rpc("increment_article_view", { p_slug: slug });
}
