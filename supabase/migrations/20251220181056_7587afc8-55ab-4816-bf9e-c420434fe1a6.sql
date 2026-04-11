-- Füge 11 neue site_visuals für die Homepage hinzu
INSERT INTO public.site_visuals (key, label, category, description, placeholder_url) VALUES
  ('home.hero.background', 'Hero Parallax Hintergrund', 'Homepage', 'Vollbreites Hintergrundbild für den Hero-Bereich mit Parallax-Effekt', '/placeholder.svg'),
  ('home.fuer-wen.background', '"Für wen?" Hintergrund', 'Homepage', 'Subtiler Hintergrund für die Zielgruppen-Sektion', '/placeholder.svg'),
  ('home.schritte.step-1', 'Schritt 1: Court liefern', 'Homepage', 'Bild zeigt Anlieferung/Aufbau eines mobilen Padel-Courts', '/placeholder.svg'),
  ('home.schritte.step-2', 'Schritt 2: App & Booking', 'Homepage', 'Bild zeigt App-Nutzung oder Buchungsvorgang', '/placeholder.svg'),
  ('home.schritte.step-3', 'Schritt 3: League & Events', 'Homepage', 'Bild zeigt Turnier-/Event-Atmosphäre', '/placeholder.svg'),
  ('home.schritte.step-4', 'Schritt 4: Loyalty wächst', 'Homepage', 'Bild zeigt Rewards, Community oder Wachstum', '/placeholder.svg'),
  ('home.vorteil.spieler', 'Vorteil Spieler Header', 'Homepage', 'Header-Bild für Spieler-Vorteile (Action-Shot)', '/placeholder.svg'),
  ('home.vorteil.vereine', 'Vorteil Vereine Header', 'Homepage', 'Header-Bild für Vereins-Vorteile (Clubhaus/Court)', '/placeholder.svg'),
  ('home.vorteil.partner', 'Vorteil Partner Header', 'Homepage', 'Header-Bild für Partner-Vorteile (Branding/Logos)', '/placeholder.svg'),
  ('home.vision.team', 'Team/Community Foto', 'Homepage', 'Großes Community- oder Team-Foto für Vision-Sektion', '/placeholder.svg'),
  ('home.cta.action', 'Final CTA Action-Shot', 'Homepage', 'Vollbreites Action-Bild für den Abschluss-CTA', '/placeholder.svg')
ON CONFLICT (key) DO NOTHING;