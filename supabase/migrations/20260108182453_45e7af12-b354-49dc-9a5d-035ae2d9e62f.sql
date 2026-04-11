-- =============================================
-- LOBBIES SYSTEM - Database Schema
-- =============================================

-- 1. Create lobby_status enum type
DO $$ BEGIN
  CREATE TYPE lobby_status AS ENUM ('open', 'full', 'cancelled', 'expired', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create lobby_member_status enum type  
DO $$ BEGIN
  CREATE TYPE lobby_member_status AS ENUM ('reserved', 'joined', 'paid', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create lobby_event_type enum type
DO $$ BEGIN
  CREATE TYPE lobby_event_type AS ENUM (
    'member_joined', 'member_paid', 'member_left', 'member_expired',
    'lobby_full', 'lobby_cancelled', 'lobby_expired', 'lobby_created'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- LOBBIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  court_id UUID NOT NULL REFERENCES public.courts(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  capacity INT NOT NULL DEFAULT 4,
  skill_min INT NOT NULL DEFAULT 1,
  skill_max INT NOT NULL DEFAULT 10,
  price_total_cents INT NOT NULL,
  price_per_player_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lobbies_status_check CHECK (status IN ('open', 'full', 'cancelled', 'expired', 'completed')),
  CONSTRAINT lobbies_capacity_check CHECK (capacity >= 2 AND capacity <= 8),
  CONSTRAINT lobbies_skill_min_check CHECK (skill_min >= 1 AND skill_min <= 10),
  CONSTRAINT lobbies_skill_max_check CHECK (skill_max >= 1 AND skill_max <= 10),
  CONSTRAINT lobbies_skill_range_valid CHECK (skill_min <= skill_max)
);

-- =============================================
-- LOBBY MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.lobby_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  reserved_until TIMESTAMPTZ,
  payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lobby_members_status_check CHECK (status IN ('reserved', 'joined', 'paid', 'cancelled', 'expired')),
  CONSTRAINT lobby_members_unique_user UNIQUE(lobby_id, user_id)
);

-- =============================================
-- LOBBY EVENTS TABLE (Audit Log)
-- =============================================
CREATE TABLE IF NOT EXISTS public.lobby_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  actor_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lobby_events_type_check CHECK (event_type IN (
    'member_joined', 'member_paid', 'member_left', 'member_expired',
    'lobby_full', 'lobby_cancelled', 'lobby_expired', 'lobby_created'
  ))
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON public.lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_start_time ON public.lobbies(start_time);
CREATE INDEX IF NOT EXISTS idx_lobbies_location_id ON public.lobbies(location_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_host_user_id ON public.lobbies(host_user_id);
CREATE INDEX IF NOT EXISTS idx_lobby_members_lobby_id ON public.lobby_members(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_members_user_id ON public.lobby_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lobby_members_reserved_until ON public.lobby_members(reserved_until) WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_lobby_events_lobby_id ON public.lobby_events(lobby_id);

-- =============================================
-- VIEW: lobby_stats
-- =============================================
CREATE OR REPLACE VIEW public.lobby_stats AS
SELECT 
  l.id as lobby_id,
  l.status,
  l.capacity,
  COUNT(lm.id) FILTER (WHERE lm.status IN ('joined', 'paid', 'reserved')) as members_count,
  COUNT(lm.id) FILTER (WHERE lm.status = 'paid') as paid_count,
  COUNT(lm.id) FILTER (WHERE lm.status = 'reserved' AND lm.reserved_until > now()) as reserved_count,
  COALESCE(
    ROUND(AVG(ss.skill_level) FILTER (WHERE lm.status IN ('joined', 'paid')), 1),
    l.skill_min
  ) as avg_skill
FROM public.lobbies l
LEFT JOIN public.lobby_members lm ON l.id = lm.lobby_id
LEFT JOIN public.skill_stats ss ON lm.user_id = ss.user_id
GROUP BY l.id;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_events ENABLE ROW LEVEL SECURITY;

-- LOBBIES Policies
CREATE POLICY "Users can view open public lobbies" ON public.lobbies
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    ((status = 'open' AND is_private = false) OR host_user_id = auth.uid())
  );

CREATE POLICY "Users can view lobbies they are members of" ON public.lobbies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lobby_members 
      WHERE lobby_id = lobbies.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lobbies" ON public.lobbies
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update own lobbies" ON public.lobbies
  FOR UPDATE USING (auth.uid() = host_user_id);

-- LOBBY_MEMBERS Policies
CREATE POLICY "Users can view lobby members of their lobbies" ON public.lobby_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.lobbies WHERE id = lobby_id AND host_user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.lobby_members lm2 WHERE lm2.lobby_id = lobby_members.lobby_id AND lm2.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join lobbies" ON public.lobby_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.lobby_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own membership" ON public.lobby_members
  FOR DELETE USING (auth.uid() = user_id);

-- LOBBY_EVENTS Policies
CREATE POLICY "Members can view lobby events" ON public.lobby_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lobby_members 
      WHERE lobby_id = lobby_events.lobby_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.lobbies 
      WHERE id = lobby_events.lobby_id AND host_user_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for lobbies
CREATE TRIGGER update_lobbies_updated_at
  BEFORE UPDATE ON public.lobbies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for lobby_members
CREATE TRIGGER update_lobby_members_updated_at
  BEFORE UPDATE ON public.lobby_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_events;