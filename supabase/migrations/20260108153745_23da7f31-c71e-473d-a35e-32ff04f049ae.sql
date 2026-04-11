-- 1. Friendship Status Enum erstellen
CREATE TYPE public.friendship_status AS ENUM 
  ('pending', 'accepted', 'declined', 'blocked', 'cancelled');

-- 2. Friendships Tabelle erstellen
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- 3. Indexes für Performance
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- 4. Updated_at Trigger
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS aktivieren
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies für Friendships
CREATE POLICY "Users can view own friendships" 
  ON public.friendships FOR SELECT 
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can send friend requests" 
  ON public.friendships FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can respond" 
  ON public.friendships FOR UPDATE 
  USING (auth.uid() = addressee_id);

CREATE POLICY "Requester can update own requests" 
  ON public.friendships FOR UPDATE 
  USING (auth.uid() = requester_id);

CREATE POLICY "Admins full access" 
  ON public.friendships FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7. Notifications Tabelle erweitern
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID;

-- 8. Index für schnelle Entity-Abfragen
CREATE INDEX IF NOT EXISTS idx_notifications_entity 
  ON public.notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notifications_actor 
  ON public.notifications(actor_id);

-- 9. Realtime für Notifications aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;