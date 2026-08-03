-- Schreibstile für den KI-News-Generator: Admin speichert mehrere Stile mit
-- Beispieltexten; die KI orientiert sich bei generierten Artikeln an Tonalität,
-- Satzbau und Struktur des gewählten Stils (Inhalte werden nie übernommen).
CREATE TABLE IF NOT EXISTS public.news_writing_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sample_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_writing_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage writing styles" ON public.news_writing_styles;
CREATE POLICY "Admins manage writing styles"
  ON public.news_writing_styles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
