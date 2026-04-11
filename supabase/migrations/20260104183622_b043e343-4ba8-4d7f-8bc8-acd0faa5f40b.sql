-- Bestehende Expert Level Daten löschen
DELETE FROM public.expert_levels_config;

-- Neue Expert Level Schwellenwerte einfügen
INSERT INTO public.expert_levels_config 
  (name, min_points, max_points, sort_order, gradient, emoji, description) 
VALUES
  ('Beginner', 0, 2999, 1, 'from-zinc-400 to-zinc-500', '🌱', 
   'Willkommen bei Padel2Go! Sammle deine ersten Play-Credits.'),
  ('Rookie', 3000, 5999, 2, 'from-amber-500 to-orange-500', '🎾', 
   'Du hast die Grundlagen gemeistert.'),
  ('Player', 6000, 9999, 3, 'from-blue-400 to-cyan-500', '⚡', 
   'Dein Spiel entwickelt sich stetig weiter.'),
  ('Expert', 10000, 14999, 4, 'from-lime-400 to-green-500', '🔥', 
   'Fortgeschrittener Spieler mit solidem Können.'),
  ('Pro', 15000, 24999, 5, 'from-orange-500 to-red-500', '💎', 
   'Profi-Niveau erreicht!'),
  ('Master', 25000, 49999, 6, 'from-purple-500 to-pink-500', '👑', 
   'Meisterliches Niveau erreicht.'),
  ('Champion', 50000, 79999, 7, 'from-cyan-400 to-violet-500', '🏆', 
   'Einer der Besten!'),
  ('Padel Legend', 80000, NULL, 8, 'from-yellow-400 to-lime-400', '🌟', 
   'Legendärer Status - Die Elite des Padel.');