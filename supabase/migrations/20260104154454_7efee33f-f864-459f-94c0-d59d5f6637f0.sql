-- =====================================================
-- PHASE 1: P2G-Points Backend Fundament
-- =====================================================

-- 1. Daily Claims Tabelle (für Daily Login Credits)
CREATE TABLE public.daily_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  claim_date date NOT NULL,
  credits_awarded integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_claims_user_date_unique UNIQUE(user_id, claim_date)
);

-- Index für schnelle Abfragen
CREATE INDEX idx_daily_claims_user_id ON public.daily_claims(user_id);
CREATE INDEX idx_daily_claims_claim_date ON public.daily_claims(claim_date);

-- RLS aktivieren
ALTER TABLE public.daily_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies für daily_claims
CREATE POLICY "Users can view own daily claims"
  ON public.daily_claims
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily claims"
  ON public.daily_claims
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert nur via Service Role (Edge Functions)
-- Keine INSERT Policy für normale User

-- 2. Expert Levels Konfiguration Tabelle
CREATE TABLE public.expert_levels_config (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  min_points integer NOT NULL,
  max_points integer, -- NULL = Infinity (höchstes Level)
  sort_order integer NOT NULL,
  gradient text,
  emoji text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.expert_levels_config ENABLE ROW LEVEL SECURITY;

-- Jeder kann Expert Levels lesen
CREATE POLICY "Anyone can view expert levels"
  ON public.expert_levels_config
  FOR SELECT
  USING (true);

-- Nur Admins können ändern
CREATE POLICY "Admins can manage expert levels"
  ON public.expert_levels_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Initial-Daten für Expert Levels (basierend auf src/lib/expertLevels.ts)
INSERT INTO public.expert_levels_config (name, min_points, max_points, sort_order, gradient, emoji, description) VALUES
  ('Beginner', 0, 999, 1, 'from-slate-400 to-slate-500', '🎾', 'Willkommen bei Padel2Go! Sammle deine ersten Play-Credits.'),
  ('Amateur', 1000, 2999, 2, 'from-emerald-400 to-emerald-600', '🌱', 'Du hast die Grundlagen gemeistert.'),
  ('Intermediate', 3000, 5999, 3, 'from-blue-400 to-blue-600', '⚡', 'Dein Spiel entwickelt sich stetig weiter.'),
  ('Advanced', 6000, 9999, 4, 'from-purple-400 to-purple-600', '🔥', 'Fortgeschrittener Spieler mit solidem Können.'),
  ('Expert', 10000, 14999, 5, 'from-orange-400 to-orange-600', '⭐', 'Experte auf dem Court!'),
  ('Master', 15000, 24999, 6, 'from-rose-400 to-rose-600', '🏆', 'Meisterliches Niveau erreicht.'),
  ('Grand Master', 25000, 49999, 7, 'from-amber-400 to-amber-600', '👑', 'Einer der Besten!'),
  ('Padel Legend', 50000, NULL, 8, 'from-yellow-300 via-yellow-400 to-amber-500', '🌟', 'Legendärer Status - Die Elite des Padel.');

-- 3. Match Analyses erweitern für W/L Ratio und Opponent
ALTER TABLE public.match_analyses 
  ADD COLUMN IF NOT EXISTS result text CHECK (result IN ('W', 'L', 'D')),
  ADD COLUMN IF NOT EXISTS opponent_user_id uuid;

-- Index für Opponent-Abfragen
CREATE INDEX IF NOT EXISTS idx_match_analyses_opponent ON public.match_analyses(opponent_user_id);
CREATE INDEX IF NOT EXISTS idx_match_analyses_result ON public.match_analyses(result);

-- Trigger für updated_at auf expert_levels_config
CREATE TRIGGER update_expert_levels_config_updated_at
  BEFORE UPDATE ON public.expert_levels_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();