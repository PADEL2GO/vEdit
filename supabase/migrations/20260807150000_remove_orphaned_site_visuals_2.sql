-- ============================================================
-- Remove orphaned site_visuals — keys still in DB but with no
-- consumer in the web frontend OR the app (verified 2026-08-07,
-- app repo checked against lib/queries/visuals.ts consumers).
-- Once deleted, they disappear from /admin/visuals and the
-- in-app admin automatically (both read the list dynamically).
-- Follow-up to 20260524000000_remove_orphaned_site_visuals.sql.
-- ============================================================

DELETE FROM public.site_visuals WHERE key IN (
  -- App → News header slot was seeded but never consumed — the news tab
  -- renders topic shaders instead of a header visual (removed from
  -- APP_VISUAL_KEYS in the app repo in the same change).
  'app.news.header',
  -- Für Spieler → no <SiteVisual/VideoEmbed> with these keys in FuerSpieler.tsx
  'fuer-spieler.ki.video-1',
  'fuer-spieler.marketplace.banner',
  -- Already deleted by 20260414110000, re-appeared via re-seed — delete again.
  'fuer-spieler.wingfield.action',
  -- Homepage → "Für wen?" section renders without a background visual
  'home.fuer-wen.background'
);
