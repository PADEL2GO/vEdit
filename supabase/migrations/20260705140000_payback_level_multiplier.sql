-- =============================================================================
-- P2G Payback-Rework: Level-Multiplikator + admin-konfigurierbare Basis + Storno-Clawback
-- Payback pro Buchung = round(Stunden * payback_points_per_hour * Level-Multiplikator),
-- gutgeschrieben auf play_credits (+ lifetime). Das Level richtet sich nach lifetime_credits.
-- Bei Storno werden die verdienten Payback-Punkte exakt & idempotent zurueckgebucht.
-- ASCII only (Supabase SQL editor).
-- =============================================================================

-- 1. Multiplikator pro Expert-Level (admin-editierbar). Default 1.0.
ALTER TABLE public.expert_levels_config
  ADD COLUMN IF NOT EXISTS multiplier numeric NOT NULL DEFAULT 1.0;

-- Sinnvolle Start-Multiplikatoren (Admin kann sie jederzeit aendern).
UPDATE public.expert_levels_config SET multiplier = 1.0  WHERE name = 'Beginner'     AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.1  WHERE name = 'Rookie'       AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.2  WHERE name = 'Player'       AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.3  WHERE name = 'Expert'       AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.5  WHERE name = 'Pro'          AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.7  WHERE name = 'Master'       AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 1.85 WHERE name = 'Champion'     AND multiplier = 1.0;
UPDATE public.expert_levels_config SET multiplier = 2.0  WHERE name = 'Padel Legend' AND multiplier = 1.0;

-- 2. Admin-konfigurierbare Basis-Payback-Punkte pro Spielstunde.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payback_points_per_hour integer NOT NULL DEFAULT 100;

-- 3. Helper: Level-Multiplikator eines Users anhand seiner lifetime_credits.
--    Wird von den Edge Functions (Award/Vorschau) genutzt. Bleibt lesbar fuer service_role.
CREATE OR REPLACE FUNCTION public.get_user_level_multiplier(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $get_mult$
DECLARE
  v_lifetime integer := 0;
  v_mult numeric := 1.0;
BEGIN
  SELECT COALESCE(lifetime_credits, 0) INTO v_lifetime
  FROM public.wallets WHERE user_id = p_user_id;

  SELECT multiplier INTO v_mult
  FROM public.expert_levels_config
  WHERE min_points <= COALESCE(v_lifetime, 0)
    AND (max_points IS NULL OR max_points >= COALESCE(v_lifetime, 0))
  ORDER BY min_points DESC
  LIMIT 1;

  RETURN COALESCE(v_mult, 1.0);
END;
$get_mult$;

REVOKE ALL ON FUNCTION public.get_user_level_multiplier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level_multiplier(uuid) TO service_role;

-- 4. cancel_confirmed_booking: zusaetzlich zur Rueckgabe ausgegebener Punkte jetzt auch
--    die VERDIENTEN Payback-Punkte (play_credits_awarded) idempotent zurueckbuchen.
--    Gleiche Signatur wie zuvor -> CREATE OR REPLACE ohne DROP. Single-winner: nur der
--    Aufruf, der confirmed->cancelled gewinnt, bucht zurueck (play_credits_awarded -> 0).
CREATE OR REPLACE FUNCTION public.cancel_confirmed_booking(p_booking_id uuid, p_user_id uuid)
RETURNS TABLE(acted boolean, credits_refunded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cancel_confirmed_booking$
DECLARE
  rec record;
  v_credits integer := 0;
  v_payback integer := 0;
BEGIN
  SELECT user_id, status, start_time, credits_used, play_credits_awarded
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  IF rec.user_id IS DISTINCT FROM p_user_id THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  IF rec.status != 'confirmed' OR now() >= rec.start_time THEN
    acted := false; credits_refunded := 0; RETURN NEXT; RETURN;
  END IF;

  v_credits := COALESCE(rec.credits_used, 0);
  v_payback := COALESCE(rec.play_credits_awarded, 0);

  UPDATE public.bookings
  SET status              = 'cancelled',
      cancelled_at        = now(),
      credits_used        = 0,
      play_credits_awarded = 0
  WHERE id = p_booking_id;

  -- (a) ausgegebene Punkte zurueck (points-as-payment).
  IF v_credits > 0 THEN
    UPDATE public.wallets
    SET reward_credits = reward_credits + v_credits, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- (b) verdiente Payback-Punkte clawback (play + lifetime, auf 0 geclamped).
  IF v_payback > 0 THEN
    PERFORM public.increment_play_and_lifetime(p_user_id, -v_payback, -v_payback);
  END IF;

  acted := true;
  credits_refunded := v_credits;
  RETURN NEXT;
  RETURN;
END;
$cancel_confirmed_booking$;

REVOKE ALL ON FUNCTION public.cancel_confirmed_booking(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_confirmed_booking(uuid, uuid) TO service_role;
