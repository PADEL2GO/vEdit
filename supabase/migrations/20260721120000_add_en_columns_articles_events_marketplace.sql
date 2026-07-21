-- EN translation siblings for the last three admin-managed content areas that were
-- built after the translate-content pipeline and never wired into it: News (articles),
-- Events (events) and the Marketplace product catalog (marketplace_items +
-- marketplace_categories). Mirrors 20260605120000_add_en_translation_columns.sql:
-- every translatable field gets a sibling *_en value + a *_en_locked boolean.
-- The translate-content Edge Function regenerates *_en on every admin save UNLESS
-- *_en_locked = true, in which case the admin's manual EN override is preserved.

-- News / articles: title, excerpt, body_html (body_html is HTML -> Edge Function uses
-- DeepL tag_handling=html for this field).
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excerpt_en text,
  ADD COLUMN IF NOT EXISTS excerpt_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS body_html_en text,
  ADD COLUMN IF NOT EXISTS body_html_en_locked boolean NOT NULL DEFAULT false;

-- Events: title, description, price_label (free text like "ab 15 €"/"Kostenlos") and
-- highlights (a text[] — the Edge Function translates it element-wise into highlights_en).
-- venue_name / city / address_line1 / postal_code stay untranslated (proper nouns/addresses).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_label_en text,
  ADD COLUMN IF NOT EXISTS price_label_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS highlights_en text[],
  ADD COLUMN IF NOT EXISTS highlights_en_locked boolean NOT NULL DEFAULT false;

-- Marketplace products: name, subtitle, description, long_description and the SEO meta
-- fields. partner_name / brand names are proper nouns and specs (jsonb) are handled
-- separately, so they are intentionally left out here.
ALTER TABLE public.marketplace_items
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS subtitle_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_description_en text,
  ADD COLUMN IF NOT EXISTS long_description_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_title_en text,
  ADD COLUMN IF NOT EXISTS meta_title_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_description_en text,
  ADD COLUMN IF NOT EXISTS meta_description_en_locked boolean NOT NULL DEFAULT false;

-- Marketplace category names (seeded German: Schläger/Bälle/Bekleidung/Schuhe/Taschen/
-- Zubehör) are shown to the public as filter chips + breadcrumbs, so they get an EN sibling.
-- Brand names (marketplace_brands) are proper nouns and are NOT translated.
ALTER TABLE public.marketplace_categories
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_en_locked boolean NOT NULL DEFAULT false;
