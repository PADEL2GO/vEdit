-- ============================================================
-- Cleanup orphaned site_visuals + add missing keys + improve labels
-- ============================================================

-- 1. DELETE ORPHANED KEYS (seeded in DB but never referenced in frontend)
DELETE FROM public.site_visuals WHERE key IN (
  -- Über Uns: team portraits use hardcoded asset images, not SiteVisual
  'ueber-uns.team.florian-steinfelder',
  'ueber-uns.team.david-klemm',
  -- FuerVereine: modell steps were replaced by verein-steps on Homepage
  'fuer-vereine.modell.step-1',
  'fuer-vereine.modell.step-2',
  'fuer-vereine.modell.step-3',
  'fuer-vereine.modell.step-4',
  'fuer-vereine.modell.step-5',
  'fuer-vereine.modell.step-6',
  -- Homepage: old keys that no longer match any SiteVisual component in Index.tsx
  'home.hero.background',
  'home.schritte.step-1',
  'home.schritte.step-2',
  'home.schritte.step-3',
  'home.schritte.step-4',
  'home.vorteil.spieler',
  'home.vorteil.vereine',
  'home.vorteil.partner',
  'home.vision.team',
  'home.cta.action',
  -- Für Spieler: these keys are not rendered anywhere in FuerSpieler.tsx
  'fuer-spieler.booking.visual',
  'fuer-spieler.ki.screenshot'
);

-- 2. ADD MISSING KEYS (used in Index.tsx but never seeded)
INSERT INTO public.site_visuals (key, label, category, description, placeholder_url) VALUES
  ('home.verein-steps.step-1', 'So funktioniert''s – Schritt 1', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 1. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('home.verein-steps.step-2', 'So funktioniert''s – Schritt 2', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 2. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('home.verein-steps.step-3', 'So funktioniert''s – Schritt 3', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 3. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('home.verein-steps.step-4', 'So funktioniert''s – Schritt 4', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 4. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('home.verein-steps.step-5', 'So funktioniert''s – Schritt 5', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 5. Empfohlene Größe: 800×600 px.', '/placeholder.svg'),
  ('home.verein-steps.step-6', 'So funktioniert''s – Schritt 6', 'Homepage – Vereinsprozess',
   'Startseite → Abschnitt "So funktioniert''s" → Karte Schritt 6. Empfohlene Größe: 800×600 px.', '/placeholder.svg')
ON CONFLICT (key) DO NOTHING;

-- 3. UPDATE DESCRIPTIONS on active keys to clearly state page + section

-- Homepage
UPDATE public.site_visuals SET
  label = '"Für wen?" – Hintergrundbild',
  category = 'Homepage – Zielgruppen',
  description = 'Startseite → Abschnitt „Für wen?" → subtiler Sektionshintergrund. Empfohlene Größe: 1920×600 px.'
WHERE key = 'home.fuer-wen.background';

-- Für Vereine
UPDATE public.site_visuals SET
  label = 'KI-Kamera – Hauptbild',
  category = 'Für Vereine – KI-Kamera',
  description = 'Seite „Für Vereine" → Abschnitt KI-Kamera → großes Feature-Bild rechts. Empfohlene Größe: 1200×800 px.'
WHERE key = 'fuer-vereine.ki-kamera';

UPDATE public.site_visuals SET
  label = 'Ökosystem – App Booking',
  category = 'Für Vereine – Digitales Ökosystem',
  description = 'Seite „Für Vereine" → Ökosystem-Kachel „App Booking". Empfohlene Größe: 600×400 px.'
WHERE key = 'fuer-vereine.oekosystem.app-booking';

UPDATE public.site_visuals SET
  label = 'Ökosystem – Score Tracking',
  category = 'Für Vereine – Digitales Ökosystem',
  description = 'Seite „Für Vereine" → Ökosystem-Kachel „Score Tracking". Empfohlene Größe: 600×400 px.'
WHERE key = 'fuer-vereine.oekosystem.score-tracking';

UPDATE public.site_visuals SET
  label = 'Ökosystem – League & Circuit',
  category = 'Für Vereine – Digitales Ökosystem',
  description = 'Seite „Für Vereine" → Ökosystem-Kachel „League & Circuit". Empfohlene Größe: 600×400 px.'
WHERE key = 'fuer-vereine.oekosystem.league-circuit';

UPDATE public.site_visuals SET
  label = 'Ökosystem – Loyalty & Rewards',
  category = 'Für Vereine – Digitales Ökosystem',
  description = 'Seite „Für Vereine" → Ökosystem-Kachel „Loyalty & Rewards". Empfohlene Größe: 600×400 px.'
WHERE key = 'fuer-vereine.oekosystem.loyalty-rewards';

-- Für Spieler
UPDATE public.site_visuals SET
  label = 'Hero – Hintergrundvideo',
  category = 'Für Spieler – Hero',
  description = 'Seite „Für Spieler" → Hero-Bereich → Hintergrundvideo. YouTube-, Vimeo- oder .mp4-URL eingeben. Empfohlene Größe: 1920×1080 px (16:9).'
WHERE key = 'fuer-spieler.hero.video';

UPDATE public.site_visuals SET
  label = 'Hero – Standbild (Fallback)',
  category = 'Für Spieler – Hero',
  description = 'Seite „Für Spieler" → Hero-Bereich → statisches Bild, solange kein Video gesetzt ist. Empfohlene Größe: 1920×1080 px.'
WHERE key = 'fuer-spieler.hero.image';

UPDATE public.site_visuals SET
  label = 'Marketplace – Banner',
  category = 'Für Spieler – Marketplace',
  description = 'Seite „Für Spieler" → Marketplace-Sektion → breites Bannerbild oben. Empfohlene Größe: 1200×400 px.'
WHERE key = 'fuer-spieler.marketplace.banner';

UPDATE public.site_visuals SET
  label = 'Wingfield – Action Shot',
  category = 'Für Spieler – Wingfield',
  description = 'Seite „Für Spieler" → Wingfield-Sektion → Foto eines Courts mit Wingfield-Kameraanlage. Empfohlene Größe: 1200×675 px.'
WHERE key = 'fuer-spieler.wingfield.action';

UPDATE public.site_visuals SET
  label = 'KI-Kamera – Demo Video 1',
  category = 'Für Spieler – KI-Kamera',
  description = 'Seite „Für Spieler" → KI-Kamera-Sektion → erstes Demo-Video links. YouTube- oder Vimeo-URL eingeben.'
WHERE key = 'fuer-spieler.ki.video-1';

UPDATE public.site_visuals SET
  label = 'KI-Kamera – Demo Video 2',
  category = 'Für Spieler – KI-Kamera',
  description = 'Seite „Für Spieler" → KI-Kamera-Sektion → zweites Demo-Video rechts. YouTube- oder Vimeo-URL eingeben.'
WHERE key = 'fuer-spieler.ki.video-2';
