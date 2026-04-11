-- =============================================
-- KI-KAMERA INTEGRATION TABELLEN
-- =============================================

-- 1. Camera API Keys - Authentifizierung für Kamera-Systeme
CREATE TABLE public.camera_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Camera Sessions - Verknüpft QR-Scans mit Matches
CREATE TABLE public.camera_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  raw_data JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Camera Session Players - Spieler pro Session
CREATE TABLE public.camera_session_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.camera_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  position TEXT NOT NULL CHECK (position IN ('LEFT', 'RIGHT')),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  match_analysis_id UUID REFERENCES public.match_analyses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Indexes für Performance
CREATE INDEX idx_camera_api_keys_location ON public.camera_api_keys(location_id);
CREATE INDEX idx_camera_api_keys_hash ON public.camera_api_keys(api_key_hash) WHERE is_active = true;
CREATE INDEX idx_camera_sessions_court ON public.camera_sessions(court_id);
CREATE INDEX idx_camera_sessions_status ON public.camera_sessions(status);
CREATE INDEX idx_camera_sessions_session_id ON public.camera_sessions(session_id);
CREATE INDEX idx_camera_session_players_user ON public.camera_session_players(user_id);
CREATE INDEX idx_camera_session_players_session ON public.camera_session_players(session_id);

-- Enable RLS
ALTER TABLE public.camera_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_session_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies für camera_api_keys (nur Admins)
CREATE POLICY "Admins can manage camera API keys"
  ON public.camera_api_keys FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies für camera_sessions
CREATE POLICY "Admins can manage camera sessions"
  ON public.camera_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view sessions they participated in"
  ON public.camera_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camera_session_players csp
      WHERE csp.session_id = camera_sessions.id
      AND csp.user_id = auth.uid()
    )
  );

-- RLS Policies für camera_session_players
CREATE POLICY "Admins can manage session players"
  ON public.camera_session_players FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own session participation"
  ON public.camera_session_players FOR SELECT
  USING (user_id = auth.uid());

-- Trigger für updated_at
CREATE TRIGGER update_camera_api_keys_updated_at
  BEFORE UPDATE ON public.camera_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_camera_sessions_updated_at
  BEFORE UPDATE ON public.camera_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();