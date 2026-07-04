-- Homepage "Ein Network. Alle Vorteile." Bento-Sektion — Backend-verwaltbare Bilder
INSERT INTO public.site_visuals (key, label, category, description, placeholder_url) VALUES
  ('home.network.courts', 'Network – Courts Kachel', 'Homepage', 'Großes Bild in der "Ein Network"-Bento-Sektion (Courts-Kachel). Dunkler Scrim wird automatisch überlagert. Empfohlene Größe: 1000×800 px.', '/placeholder.svg'),
  ('home.network.events', 'Network – Events Kachel', 'Homepage', 'Großes Bild in der "Ein Network"-Bento-Sektion (Events-Kachel). Dunkler Scrim wird automatisch überlagert. Empfohlene Größe: 1000×600 px.', '/placeholder.svg')
ON CONFLICT (key) DO NOTHING;
