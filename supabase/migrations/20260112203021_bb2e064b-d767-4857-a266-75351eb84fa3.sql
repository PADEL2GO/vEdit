-- ============================================
-- Fix infinite recursion in lobby RLS policies
-- ============================================

-- 1) Create SECURITY DEFINER helper functions
-- These encapsulate the membership/host checks without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.is_lobby_member(_lobby_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lobby_members
    WHERE lobby_id = _lobby_id
      AND user_id = _user_id
      AND status IN ('reserved', 'joined', 'paid')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_lobby_host(_lobby_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE id = _lobby_id
      AND host_user_id = _user_id
  );
$$;

-- 2) Drop ALL existing policies on lobbies, lobby_members, lobby_events

DROP POLICY IF EXISTS "Users can view open lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Users can view lobbies they host" ON public.lobbies;
DROP POLICY IF EXISTS "Users can view lobbies they are members of" ON public.lobbies;
DROP POLICY IF EXISTS "Users can create lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Hosts can update their lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Admins have full access to lobbies" ON public.lobbies;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.lobby_members;
DROP POLICY IF EXISTS "Hosts can view their lobby members" ON public.lobby_members;
DROP POLICY IF EXISTS "Members can view co-members" ON public.lobby_members;
DROP POLICY IF EXISTS "Users can join lobbies" ON public.lobby_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.lobby_members;
DROP POLICY IF EXISTS "Admins have full access to lobby_members" ON public.lobby_members;

DROP POLICY IF EXISTS "Users can view events for their lobbies" ON public.lobby_events;
DROP POLICY IF EXISTS "System can insert lobby events" ON public.lobby_events;
DROP POLICY IF EXISTS "Admins have full access to lobby_events" ON public.lobby_events;

-- 3) Recreate policies using SECURITY DEFINER functions (no cross-table subqueries)

-- === LOBBIES ===

-- Admins can do everything
CREATE POLICY "Admins have full access to lobbies"
ON public.lobbies FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view open/public lobbies
CREATE POLICY "Users can view open lobbies"
ON public.lobbies FOR SELECT
USING (status = 'open' AND (is_private = false OR is_private IS NULL));

-- Users can view lobbies they host
CREATE POLICY "Users can view lobbies they host"
ON public.lobbies FOR SELECT
USING (host_user_id = auth.uid());

-- Users can view lobbies they are members of (via function)
CREATE POLICY "Users can view lobbies they are members of"
ON public.lobbies FOR SELECT
USING (public.is_lobby_member(id, auth.uid()));

-- Users can create lobbies
CREATE POLICY "Users can create lobbies"
ON public.lobbies FOR INSERT
WITH CHECK (host_user_id = auth.uid());

-- Hosts can update their lobbies
CREATE POLICY "Hosts can update their lobbies"
ON public.lobbies FOR UPDATE
USING (host_user_id = auth.uid());

-- === LOBBY_MEMBERS ===

-- Admins can do everything
CREATE POLICY "Admins have full access to lobby_members"
ON public.lobby_members FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.lobby_members FOR SELECT
USING (user_id = auth.uid());

-- Hosts can view members of their lobbies (via function)
CREATE POLICY "Hosts can view their lobby members"
ON public.lobby_members FOR SELECT
USING (public.is_lobby_host(lobby_id, auth.uid()));

-- Members can view co-members (via function)
CREATE POLICY "Members can view co-members"
ON public.lobby_members FOR SELECT
USING (public.is_lobby_member(lobby_id, auth.uid()));

-- Users can join lobbies (insert own membership)
CREATE POLICY "Users can join lobbies"
ON public.lobby_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own membership
CREATE POLICY "Users can update their own membership"
ON public.lobby_members FOR UPDATE
USING (user_id = auth.uid());

-- === LOBBY_EVENTS ===

-- Admins can do everything
CREATE POLICY "Admins have full access to lobby_events"
ON public.lobby_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view events for lobbies they host or are members of
CREATE POLICY "Users can view events for their lobbies"
ON public.lobby_events FOR SELECT
USING (
  public.is_lobby_host(lobby_id, auth.uid()) 
  OR public.is_lobby_member(lobby_id, auth.uid())
);

-- System can insert lobby events (service role will bypass RLS anyway)
CREATE POLICY "System can insert lobby events"
ON public.lobby_events FOR INSERT
WITH CHECK (true);