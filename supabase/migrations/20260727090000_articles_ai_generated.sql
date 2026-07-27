-- Weekly AI news generator: articles created by the generator carry a flag so
-- the frontend can label them (AI Act Art. 50 transparency, audit REQ-E03).
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;
