-- News-Redesign: Kategorien, erweiterte Artikel-Felder, Likes (User oder IP), View-Counter
-- Frontend: /news (4:5-Grid + Highlight-Rail + Filter) und /news/:slug

-- ── Kategorien ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  name_en    TEXT,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active categories" ON public.news_categories;
CREATE POLICY "Anyone reads active categories"
  ON public.news_categories FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins read all categories" ON public.news_categories;
CREATE POLICY "Admins read all categories"
  ON public.news_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write categories" ON public.news_categories;
CREATE POLICY "Admins write categories"
  ON public.news_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.news_categories (name, name_en, slug, sort_order) VALUES
  ('Standorte',   'Locations',   'standorte',   1),
  ('Liga',        'League',      'liga',        2),
  ('Community',   'Community',   'community',   3),
  ('Marketplace', 'Marketplace', 'marketplace', 4)
ON CONFLICT (slug) DO NOTHING;

-- ── Artikel-Erweiterung ───────────────────────────────────────────────────────
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.news_categories(id) ON DELETE SET NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS featured_rank INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reading_minutes INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title_highlight TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title_highlight_en TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS lead TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS lead_en TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_alt TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cta_subtitle TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cta_label TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Slug-Backfill aus dem Titel (Umlaute ersetzen, alles andere zu Bindestrich);
-- ID-Suffix garantiert Eindeutigkeit ohne Kollisionsbehandlung.
UPDATE public.articles
SET slug = trim(BOTH '-' FROM
      regexp_replace(
        translate(lower(title), 'äöüß', 'aous'),
        '[^a-z0-9]+', '-', 'g'
      )
    ) || '-' || left(id::text, 6)
WHERE slug IS NULL;

ALTER TABLE public.articles ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);

-- ── Likes: 1× pro eingeloggtem User ODER 1× pro IP (anonym) ──────────────────
CREATE TABLE IF NOT EXISTS public.news_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR ip_hash IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_likes_user
  ON public.news_likes (article_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_likes_ip
  ON public.news_likes (article_id, ip_hash) WHERE user_id IS NULL AND ip_hash IS NOT NULL;

-- Kein öffentlicher Zugriff: Schreiben/Lesen läuft ausschließlich über die
-- Edge Function news-like (Service-Role), die den Zähler zurückgibt.
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;

-- like_count denormalisiert auf articles halten
CREATE OR REPLACE FUNCTION public.news_likes_sync_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target UUID := COALESCE(NEW.article_id, OLD.article_id);
BEGIN
  UPDATE public.articles
  SET like_count = (SELECT count(*) FROM public.news_likes WHERE article_id = target)
  WHERE id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_likes_sync_count ON public.news_likes;
CREATE TRIGGER trg_news_likes_sync_count
  AFTER INSERT OR DELETE ON public.news_likes
  FOR EACH ROW EXECUTE FUNCTION public.news_likes_sync_count();

-- ── View-Counter (atomar, öffentlich aufrufbar) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_article_view(p_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.articles
  SET view_count = view_count + 1
  WHERE slug = p_slug AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_article_view(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_article_view(TEXT) TO anon, authenticated;
