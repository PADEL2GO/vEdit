-- Add credit_type column to points_ledger for distinguishing REWARD vs SKILL credits
ALTER TABLE public.points_ledger 
ADD COLUMN IF NOT EXISTS credit_type TEXT NOT NULL DEFAULT 'REWARD';

-- Add source_type and source_id for better traceability
ALTER TABLE public.points_ledger 
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create index for credit_type queries
CREATE INDEX IF NOT EXISTS idx_points_ledger_credit_type ON public.points_ledger(credit_type);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_credit_type ON public.points_ledger(user_id, credit_type);

-- Create match_analyses table for Skill-Credits calculations
CREATE TABLE IF NOT EXISTS public.match_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  ai_score INTEGER,
  manual_score INTEGER,
  skill_level_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
  formula_version INTEGER NOT NULL DEFAULT 1,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'INVALIDATED')),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id, formula_version)
);

-- Create skill_credits_config table for admin configuration
CREATE TABLE IF NOT EXISTS public.skill_credits_config (
  id TEXT NOT NULL DEFAULT 'global' PRIMARY KEY,
  formula_version INTEGER NOT NULL DEFAULT 1,
  base_multiplier NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
  max_credits_per_match INTEGER NOT NULL DEFAULT 500,
  rounding_policy TEXT NOT NULL DEFAULT 'floor' CHECK (rounding_policy IN ('floor', 'ceil', 'round')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default global config
INSERT INTO public.skill_credits_config (id, formula_version, base_multiplier, max_credits_per_match, rounding_policy)
VALUES ('global', 1, 1.0, 500, 'floor')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.match_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_credits_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for match_analyses
CREATE POLICY "Users can view own match analyses"
ON public.match_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all match analyses"
ON public.match_analyses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage match analyses"
ON public.match_analyses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for skill_credits_config
CREATE POLICY "Anyone can view skill credits config"
ON public.skill_credits_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage skill credits config"
ON public.skill_credits_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for match_analyses
CREATE INDEX IF NOT EXISTS idx_match_analyses_user_id ON public.match_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_match_analyses_status ON public.match_analyses(status);
CREATE INDEX IF NOT EXISTS idx_match_analyses_match_id ON public.match_analyses(match_id);

-- Add trigger for updated_at on match_analyses
CREATE TRIGGER update_match_analyses_updated_at
BEFORE UPDATE ON public.match_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on skill_credits_config
CREATE TRIGGER update_skill_credits_config_updated_at
BEFORE UPDATE ON public.skill_credits_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();