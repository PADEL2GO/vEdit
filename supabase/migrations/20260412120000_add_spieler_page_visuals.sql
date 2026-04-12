-- Für Spieler page visuals + hero video support
INSERT INTO public.site_visuals (key, label, category, description, placeholder_url) VALUES
  ('fuer-spieler.hero.video',         'Hero Video / Hintergrundbild',   'Für Spieler', 'YouTube- oder Vimeo-URL für das Hero-Hintergrundvideo (oder direkter .mp4-Link). Empfohlene Größe: 1920×1080 px (16:9). Falls leer, wird das Standard-Standby-Bild angezeigt.', '/placeholder.svg'),
  ('fuer-spieler.hero.image',         'Hero Standbild (Fallback)',       'Für Spieler', 'Statisches Hintergrundbild, das angezeigt wird, solange kein Video gesetzt ist. Empfohlene Größe: 1920×1080 px.', '/placeholder.svg'),
  ('fuer-spieler.booking.visual',     'Buchungs-Sektion – Bild',         'Für Spieler', 'Bild oder Szene neben den Buchungsschritten. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('fuer-spieler.marketplace.banner', 'Marketplace – Banner',            'Für Spieler', 'Querformat-Banner für die Marketplace-Sektion (Equipment, Rewards). Empfohlene Größe: 1200×400 px.', '/placeholder.svg'),
  ('fuer-spieler.ki.video-1',         'KI-Kamera – Demo Video 1',        'Für Spieler', 'YouTube- oder Vimeo-URL für die erste KI-Kamera-Demo. Falls leer, wird Platzhalter angezeigt.', '/placeholder.svg'),
  ('fuer-spieler.ki.video-2',         'KI-Kamera – Demo Video 2',        'Für Spieler', 'YouTube- oder Vimeo-URL für die zweite KI-Kamera-Demo. Falls leer, wird Platzhalter angezeigt.', '/placeholder.svg'),
  ('fuer-spieler.ki.screenshot',      'KI-Kamera – App Screenshot',      'Für Spieler', 'Screenshot der KI-Auswertung in der App. Empfohlene Größe: 600×1000 px (Hochformat).', '/placeholder.svg'),
  ('fuer-spieler.wingfield.action',   'Wingfield – Action Shot',         'Für Spieler', 'Foto eines Padel-Courts mit Wingfield-Kameraanlage. Empfohlene Größe: 1200×675 px.', '/placeholder.svg')
ON CONFLICT (key) DO NOTHING;
