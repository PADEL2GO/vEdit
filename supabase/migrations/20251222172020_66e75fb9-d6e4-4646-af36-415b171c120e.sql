-- Insert 4 new Bavarian locations with courts

-- 1. PADEL2GO München
INSERT INTO public.locations (
  name, slug, address, postal_code, city, country,
  description, amenities, rewards_enabled, ai_analysis_enabled, vending_enabled,
  is_online, is_24_7, timezone,
  opening_hours_json, features_json
) VALUES (
  'PADEL2GO München', 'muenchen',
  'Olympiapark Süd 21', '80809', 'München', 'Deutschland',
  'Unser Premium-Standort im Herzen von München direkt am Olympiapark. Vier Indoor-Courts mit modernster Ausstattung und AI-Spielanalyse.',
  ARRAY['Duschen', 'Umkleiden', 'Lounge', 'Pro-Shop', 'WLAN', 'Parkplätze'],
  true, true, true, true, false, 'Europe/Berlin',
  '{"monday": {"open": "07:00", "close": "23:00"}, "tuesday": {"open": "07:00", "close": "23:00"}, "wednesday": {"open": "07:00", "close": "23:00"}, "thursday": {"open": "07:00", "close": "23:00"}, "friday": {"open": "07:00", "close": "24:00"}, "saturday": {"open": "08:00", "close": "24:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
  '{"wifi": true, "accessible": true, "family_friendly": true}'::jsonb
);

INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 1', true FROM public.locations WHERE slug = 'muenchen';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 2', true FROM public.locations WHERE slug = 'muenchen';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 3', true FROM public.locations WHERE slug = 'muenchen';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 4', true FROM public.locations WHERE slug = 'muenchen';

-- 2. PADEL2GO Nürnberg
INSERT INTO public.locations (
  name, slug, address, postal_code, city, country,
  description, amenities, rewards_enabled, ai_analysis_enabled, vending_enabled,
  is_online, is_24_7, timezone,
  opening_hours_json, features_json
) VALUES (
  'PADEL2GO Nürnberg', 'nuernberg',
  'Marienbergstraße 89', '90411', 'Nürnberg', 'Deutschland',
  'Drei moderne Padel-Courts mit AI-Analyse in Nürnberg. Perfekt gelegen mit guter Anbindung und eigenem Café.',
  ARRAY['Duschen', 'Umkleiden', 'Café', 'Parkplätze', 'WLAN'],
  true, true, false, true, false, 'Europe/Berlin',
  '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "21:00"}}'::jsonb,
  '{"wifi": true, "accessible": false, "family_friendly": true}'::jsonb
);

INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 1', true FROM public.locations WHERE slug = 'nuernberg';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 2', true FROM public.locations WHERE slug = 'nuernberg';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 3', true FROM public.locations WHERE slug = 'nuernberg';

-- 3. PADEL2GO Regensburg
INSERT INTO public.locations (
  name, slug, address, postal_code, city, country,
  description, amenities, rewards_enabled, ai_analysis_enabled, vending_enabled,
  is_online, is_24_7, timezone,
  opening_hours_json, features_json
) VALUES (
  'PADEL2GO Regensburg', 'regensburg',
  'Universitätsstraße 31', '93053', 'Regensburg', 'Deutschland',
  'Universitätsnahe Padel-Anlage mit zwei Courts und Getränkeautomat. Ideal für Studierende und Berufstätige.',
  ARRAY['Duschen', 'Umkleiden', 'Parkplätze', 'Getränkeautomat'],
  true, false, true, true, false, 'Europe/Berlin',
  '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "friday": {"open": "09:00", "close": "22:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "20:00"}}'::jsonb,
  '{"wifi": true, "accessible": false, "family_friendly": false}'::jsonb
);

INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 1', true FROM public.locations WHERE slug = 'regensburg';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 2', true FROM public.locations WHERE slug = 'regensburg';

-- 4. PADEL2GO Würzburg
INSERT INTO public.locations (
  name, slug, address, postal_code, city, country,
  description, amenities, rewards_enabled, ai_analysis_enabled, vending_enabled,
  is_online, is_24_7, timezone,
  opening_hours_json, features_json
) VALUES (
  'PADEL2GO Würzburg', 'wuerzburg',
  'Zellerauer Straße 15', '97082', 'Würzburg', 'Deutschland',
  'Unsere gemütliche Anlage in Würzburg mit zwei Outdoor-Courts im Herzen Unterfrankens.',
  ARRAY['Duschen', 'Umkleiden'],
  true, false, false, true, false, 'Europe/Berlin',
  '{"monday": {"open": "10:00", "close": "20:00"}, "tuesday": {"open": "10:00", "close": "20:00"}, "wednesday": {"open": "10:00", "close": "20:00"}, "thursday": {"open": "10:00", "close": "20:00"}, "friday": {"open": "10:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "21:00"}, "sunday": {"open": "11:00", "close": "19:00"}}'::jsonb,
  '{"wifi": false, "accessible": false, "family_friendly": true}'::jsonb
);

INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 1', true FROM public.locations WHERE slug = 'wuerzburg';
INSERT INTO public.courts (location_id, name, is_active)
SELECT id, 'Court 2', true FROM public.locations WHERE slug = 'wuerzburg';