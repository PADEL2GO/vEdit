-- Fix RLS Policy Infinite Recursion für Club-Tabellen
-- Verwendet existierende SECURITY DEFINER Funktionen: get_user_club_id() und is_club_member()

-- 1. Alte problematische Policies löschen
DROP POLICY IF EXISTS "Club users can view members of their club" ON club_users;
DROP POLICY IF EXISTS "Club users can view their club" ON clubs;
DROP POLICY IF EXISTS "Club users can view their court assignments" ON club_court_assignments;

-- 2. Neue Policies für club_users
-- User kann eigene Mitgliedschaft sehen
CREATE POLICY "Users can view own club membership" ON club_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Club-Mitglieder können andere Mitglieder ihres Clubs sehen (nutzt SECURITY DEFINER Funktion)
CREATE POLICY "Club members can view their club members" ON club_users
  FOR SELECT TO authenticated  
  USING (club_id = public.get_user_club_id(auth.uid()));

-- Admins können alle sehen
CREATE POLICY "Admins can view all club users" ON club_users
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Neue Policies für clubs
CREATE POLICY "Club members can view their club" ON clubs
  FOR SELECT TO authenticated
  USING (id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can view all clubs" ON clubs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Neue Policies für club_court_assignments
CREATE POLICY "Club members can view their court assignments" ON club_court_assignments
  FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can view all court assignments" ON club_court_assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));