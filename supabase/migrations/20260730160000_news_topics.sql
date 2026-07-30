-- News-Topics: festes 5-Topic-System mit Frontend-Farbcode ersetzt die freien Kategorien.
-- Der Topic-String ist der Schlüssel — Farben leben ausschließlich im Frontend (TOPIC_COLORS).

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'Inside P2G';

ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_topic_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_topic_check
  CHECK (topic IN ('Inside P2G', 'Events', 'Marketplace', 'Community', 'Business'));

-- Übernahme aus dem alten Kategorie-System, falls zugewiesen
UPDATE public.articles a
SET topic = CASE c.slug
  WHEN 'marketplace' THEN 'Marketplace'
  WHEN 'community'   THEN 'Community'
  WHEN 'liga'        THEN 'Community'
  ELSE 'Inside P2G'
END
FROM public.news_categories c
WHERE a.category_id = c.id;

-- Sinnvolle Startwerte für die vier Bestands-Presseartikel (im Admin änderbar)
UPDATE public.articles SET topic = 'Business'
WHERE category_id IS NULL
  AND (title ILIKE '%NBA%' OR title ILIKE '%Ronaldo%' OR title ILIKE '%Padel-Report%');
UPDATE public.articles SET topic = 'Community'
WHERE category_id IS NULL AND title ILIKE '%SV Höhenberg%';

CREATE INDEX IF NOT EXISTS idx_articles_topic ON public.articles (topic);
