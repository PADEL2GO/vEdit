-- Fix missing admin RLS policies across all tables used by the admin panel.
-- Each block is idempotent (DROP IF EXISTS + CREATE).

-- ── locations ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── courts ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage courts" ON public.courts;
CREATE POLICY "Admins can manage courts" ON public.courts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── court_prices ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage court prices" ON public.court_prices;
CREATE POLICY "Admins can manage court prices" ON public.court_prices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── profiles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── wallets ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage wallets" ON public.wallets;
CREATE POLICY "Admins can manage wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── notifications ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── reward_instances ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage reward instances" ON public.reward_instances;
CREATE POLICY "Admins can manage reward instances" ON public.reward_instances
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── points_ledger ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage points ledger" ON public.points_ledger;
CREATE POLICY "Admins can manage points ledger" ON public.points_ledger
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── club_users ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage club users" ON public.club_users;
CREATE POLICY "Admins can manage club users" ON public.club_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── club_court_assignments ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all club court assignments" ON public.club_court_assignments;
CREATE POLICY "Admins can manage all club court assignments" ON public.club_court_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── club_quota_ledger ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage club quota ledger" ON public.club_quota_ledger;
CREATE POLICY "Admins can manage club quota ledger" ON public.club_quota_ledger
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── marketplace_redemptions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage marketplace redemptions" ON public.marketplace_redemptions;
CREATE POLICY "Admins can manage marketplace redemptions" ON public.marketplace_redemptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── voucher_codes ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage voucher codes" ON public.voucher_codes;
CREATE POLICY "Admins can manage voucher codes" ON public.voucher_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── skill_stats ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage skill stats" ON public.skill_stats;
CREATE POLICY "Admins can manage skill stats" ON public.skill_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── match_analyses ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage match analyses" ON public.match_analyses;
CREATE POLICY "Admins can manage match analyses" ON public.match_analyses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
