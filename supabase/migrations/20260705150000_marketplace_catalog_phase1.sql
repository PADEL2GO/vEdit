-- =============================================================================
-- Marketplace Phase 1 — echter Produktkatalog (einfache Produkte, keine Varianten,
-- kein Warenkorb). Neu: Kategorien, Marken, Produktbild-Galerie; marketplace_items
-- erweitert um slug (eigene Produktseiten), category_id, brand_id, Specs, Status, SEO.
-- Bestehende Checkout-/Order-Infrastruktur bleibt unveraendert.
-- =============================================================================

-- 1) Kategorien (mit optionaler Hierarchie) ----------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active categories" ON public.marketplace_categories
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage categories" ON public.marketplace_categories
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2) Marken ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active brands" ON public.marketplace_brands
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage brands" ON public.marketplace_brands
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3) Produktbilder-Galerie (1:n) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view item images" ON public.marketplace_item_images
  FOR SELECT USING (true);
CREATE POLICY "admins manage item images" ON public.marketplace_item_images
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_mp_item_images_item ON public.marketplace_item_images(item_id, sort_order);

-- 4) Produkt-Erweiterungen ----------------------------------------------------
ALTER TABLE public.marketplace_items
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.marketplace_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compare_at_price_cents integer,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text;

-- Eindeutige Slugs (partiell, ignoriert NULL bestehender Produkte).
CREATE UNIQUE INDEX IF NOT EXISTS uidx_marketplace_items_slug
  ON public.marketplace_items(slug) WHERE slug IS NOT NULL;

-- Status-Check (idempotent).
DO $mp_status$ BEGIN
  ALTER TABLE public.marketplace_items
    ADD CONSTRAINT marketplace_items_status_check CHECK (status IN ('draft','published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $mp_status$;

-- 5) Seed-Kategorien (Equipment) ---------------------------------------------
INSERT INTO public.marketplace_categories (name, slug, sort_order) VALUES
  ('Schläger', 'schlaeger', 1),
  ('Bälle', 'baelle', 2),
  ('Bekleidung', 'bekleidung', 3),
  ('Schuhe', 'schuhe', 4),
  ('Taschen', 'taschen', 5),
  ('Zubehör', 'zubehoer', 6)
ON CONFLICT (slug) DO NOTHING;
