-- Cleanup: site_visuals-Einträge entfernen, die weder Website noch App noch zeigen.
-- Audit 2026-08-07 (Code-Grep über src/ + Live-Tabellen-Abgleich):
--
-- Web zeigt genau diese 10 Keys:
--   fuer-spieler.hero.image / fuer-spieler.hero.video   (FuerSpieler.tsx, HeroBackgroundVisual)
--   home.network.courts / home.network.events           (Index.tsx, Bento "Ein Network")
--   home.verein-steps.step-1 .. step-6                  (FuerVereine.tsx, Schritte-Karten)
-- app.% gehört der iOS-App und bleibt KOMPLETT unberührt: app.theme.* sind die
-- Section-Farben (Admin -> Farben), dazu App-Visuals wie app.auth.backdrop,
-- app.booking.header, app.home.* etc. (live angelegt, nicht in Migrationen).
--
-- Gelöscht werden damit die 4 Web-Waisen:
--   fuer-spieler.ki.video-1         (KI-Sektion nutzt keine Backend-Videos mehr)
--   fuer-spieler.marketplace.banner (Marketplace-Sektion ohne Backend-Banner)
--   home.fuer-wen.background        (Fuer-wen-Sektion ohne Backend-Bild)
--   fuer-spieler.wingfield.action   (Lösch-Migration 20260414110000 lief live nie)
-- Die Allowlist-Form räumt zusätzlich eventuell manuell angelegte Web-Reste ab.
-- Hinweis: Bereits hochgeladene Dateien im Storage-Bucket bleiben liegen
-- (kein Storage-Delete aus einer SQL-Migration) — unkritisch, nur Speicher.

DELETE FROM public.site_visuals
WHERE key NOT LIKE 'app.%'
  AND key NOT IN (
    'fuer-spieler.hero.image',
    'fuer-spieler.hero.video',
    'home.network.courts',
    'home.network.events',
    'home.verein-steps.step-1',
    'home.verein-steps.step-2',
    'home.verein-steps.step-3',
    'home.verein-steps.step-4',
    'home.verein-steps.step-5',
    'home.verein-steps.step-6'
  );
