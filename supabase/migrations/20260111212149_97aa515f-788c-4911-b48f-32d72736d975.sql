
-- =============================================
-- PHASE 1: Club Management Datenmodell
-- =============================================

-- 1. Clubs Tabelle
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_contact_email text,
  description text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Club Court Assignments (Kontingent pro Club pro Court)
CREATE TABLE public.club_court_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  weekly_free_minutes integer NOT NULL DEFAULT 600,
  weekly_reset_weekday integer NOT NULL DEFAULT 1 CHECK (weekly_reset_weekday >= 0 AND weekly_reset_weekday <= 6),
  allowed_booking_windows jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, court_id)
);

-- 3. Club Users (Mehrere User pro Club)
CREATE TABLE public.club_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_in_club text NOT NULL DEFAULT 'staff' CHECK (role_in_club IN ('manager', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 4. Erweiterung bookings Tabelle
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id),
ADD COLUMN IF NOT EXISTS club_booked_by_user_id uuid;

-- 5. Erweiterung club_quota_ledger mit club_id
ALTER TABLE public.club_quota_ledger 
ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id);

-- =============================================
-- RLS aktivieren
-- =============================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_court_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: clubs
-- =============================================

-- Admins können alles
CREATE POLICY "Admins can manage all clubs"
ON public.clubs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Club-User können ihren Club sehen
CREATE POLICY "Club users can view their club"
ON public.clubs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_users cu
    WHERE cu.club_id = clubs.id 
    AND cu.user_id = auth.uid() 
    AND cu.is_active = true
  )
);

-- =============================================
-- RLS Policies: club_court_assignments
-- =============================================

-- Admins können alles
CREATE POLICY "Admins can manage all club court assignments"
ON public.club_court_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Club-User können ihre Court-Zuweisungen sehen
CREATE POLICY "Club users can view their court assignments"
ON public.club_court_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_users cu
    WHERE cu.club_id = club_court_assignments.club_id 
    AND cu.user_id = auth.uid() 
    AND cu.is_active = true
  )
);

-- =============================================
-- RLS Policies: club_users
-- =============================================

-- Admins können alles
CREATE POLICY "Admins can manage all club users"
ON public.club_users FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Club-User können Mitglieder ihres Clubs sehen
CREATE POLICY "Club users can view members of their club"
ON public.club_users FOR SELECT
USING (
  club_id IN (
    SELECT cu.club_id FROM public.club_users cu 
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
  )
);

-- =============================================
-- Erweiterte RLS für club_quota_ledger
-- =============================================

-- Club-User können Ledger ihres Clubs sehen
CREATE POLICY "Club users can view their club quota ledger"
ON public.club_quota_ledger FOR SELECT
USING (
  club_id IN (
    SELECT cu.club_id FROM public.club_users cu 
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
  )
);

-- =============================================
-- Triggers für updated_at
-- =============================================

CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_court_assignments_updated_at
BEFORE UPDATE ON public.club_court_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_users_updated_at
BEFORE UPDATE ON public.club_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Indizes für Performance
-- =============================================

CREATE INDEX idx_club_users_user_id ON public.club_users(user_id);
CREATE INDEX idx_club_users_club_id ON public.club_users(club_id);
CREATE INDEX idx_club_users_active ON public.club_users(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_club_court_assignments_club_id ON public.club_court_assignments(club_id);
CREATE INDEX idx_club_court_assignments_court_id ON public.club_court_assignments(court_id);
CREATE INDEX idx_bookings_club_id ON public.bookings(club_id) WHERE club_id IS NOT NULL;
CREATE INDEX idx_club_quota_ledger_club_id ON public.club_quota_ledger(club_id) WHERE club_id IS NOT NULL;

-- =============================================
-- Hilfsfunktion: Prüft ob User Club-Mitglied ist
-- =============================================

CREATE OR REPLACE FUNCTION public.is_club_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_users 
    WHERE user_id = p_user_id AND is_active = true
  );
$$;

-- =============================================
-- Hilfsfunktion: Gibt Club-ID für User zurück
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_club_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM club_users 
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
$$;
