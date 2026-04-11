-- Create match_opt_in_settings table for user matching preferences
CREATE TABLE public.match_opt_in_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  preferred_location_ids UUID[] DEFAULT '{}',
  skill_range_min INTEGER DEFAULT 1,
  skill_range_max INTEGER DEFAULT 10,
  availability_json JSONB DEFAULT '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create match_suggestions table for weekly match pairings
CREATE TABLE public.match_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  matched_user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suggested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  score INTEGER DEFAULT 0,
  match_reason TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, matched_user_id, suggested_date)
);

-- Enable Row Level Security
ALTER TABLE public.match_opt_in_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_opt_in_settings
CREATE POLICY "Users can view their own opt-in settings"
ON public.match_opt_in_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opt-in settings"
ON public.match_opt_in_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opt-in settings"
ON public.match_opt_in_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for match_suggestions
CREATE POLICY "Users can view their own match suggestions"
ON public.match_suggestions
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can update their own match suggestions"
ON public.match_suggestions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_match_opt_in_settings_updated_at
BEFORE UPDATE ON public.match_opt_in_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_match_suggestions_updated_at
BEFORE UPDATE ON public.match_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_match_suggestions_user_status ON public.match_suggestions(user_id, status);
CREATE INDEX idx_match_suggestions_expires ON public.match_suggestions(expires_at);
CREATE INDEX idx_match_opt_in_active ON public.match_opt_in_settings(is_active) WHERE is_active = true;