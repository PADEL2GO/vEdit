-- Lock-Spalten für die neuen übersetzbaren Felder (title_highlight, lead).
-- translate-content selektiert <feld>_en_locked für jedes registrierte Feld —
-- ohne diese Spalten schlägt die Artikel-Übersetzung fehl.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS title_highlight_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_en_locked boolean NOT NULL DEFAULT false;
