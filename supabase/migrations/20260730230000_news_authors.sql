-- Artikel-Autoren: verwaltbare Mitarbeiter-Profile (Name, Rolle, Foto),
-- pro Artikel auswählbar — angezeigt in der "Geschrieben von"-Sidebar.
CREATE TABLE IF NOT EXISTS public.news_authors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  role       TEXT,
  role_en    TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads authors" ON public.news_authors;
CREATE POLICY "Anyone reads authors"
  ON public.news_authors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins write authors" ON public.news_authors;
CREATE POLICY "Admins write authors"
  ON public.news_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.news_authors(id) ON DELETE SET NULL;

INSERT INTO public.news_authors (name, role, role_en)
SELECT 'Florian Steinfelder', 'Founder, PADEL2GO', 'Founder, PADEL2GO'
WHERE NOT EXISTS (SELECT 1 FROM public.news_authors WHERE name = 'Florian Steinfelder');
