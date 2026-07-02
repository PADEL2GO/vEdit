-- P2G ECONOMY (July 2026): unified points discount currency + admin set.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reserved_reward integer NOT NULL DEFAULT 0;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS price_cents integer;

-- Allow the ADMIN_SET ledger entry_type used by the admin "set to value" action.
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_entry_type_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_entry_type_check
  CHECK (entry_type IN (
    'EARN_CLAIM', 'REVERSAL', 'ADMIN_ADJUST', 'MARKETPLACE_REDEEM',
    'AUTO_CREDIT', 'STREAK_BONUS', 'REDEMPTION', 'REPAIR_CLAIM',
    'ADMIN_APPROVED', 'ADMIN_CREDIT', 'ADMIN_RESET', 'ADMIN_SET'
  ));

-- reserve_points: spend play first, then reward; never overdraw. Returns amounts spent.
CREATE OR REPLACE FUNCTION public.reserve_points(p_user_id uuid, p_amount integer)
RETURNS TABLE (play_spent integer, reward_spent integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $reserve_points$
DECLARE v_play integer; v_reward integer; v_from_play integer; v_from_reward integer;
BEGIN
  IF p_amount IS NULL OR 0 >= p_amount THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
  SELECT play_credits, reward_credits INTO v_play, v_reward
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR p_amount > COALESCE(v_play,0) + COALESCE(v_reward,0) THEN
    RETURN QUERY SELECT 0, 0; RETURN;
  END IF;
  v_from_play := LEAST(v_play, p_amount);
  v_from_reward := p_amount - v_from_play;
  UPDATE public.wallets
  SET play_credits = play_credits - v_from_play,
      reward_credits = reward_credits - v_from_reward,
      updated_at = now()
  WHERE user_id = p_user_id;
  RETURN QUERY SELECT v_from_play, v_from_reward;
END;
$reserve_points$;
REVOKE ALL ON FUNCTION public.reserve_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_points(uuid, integer) TO service_role;

-- refund_points: add back on cancel/expiry (never touches lifetime).
CREATE OR REPLACE FUNCTION public.refund_points(p_user_id uuid, p_play integer, p_reward integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $refund_points$
BEGIN
  UPDATE public.wallets
  SET play_credits = play_credits + GREATEST(0, COALESCE(p_play,0)),
      reward_credits = reward_credits + GREATEST(0, COALESCE(p_reward,0)),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$refund_points$;
REVOKE ALL ON FUNCTION public.refund_points(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points(uuid, integer, integer) TO service_role;

-- set_wallet_credits: superadmin "set to exact value" for one credit type + optional lifetime.
CREATE OR REPLACE FUNCTION public.set_wallet_credits(
  p_user_id uuid, p_credit_type text, p_value integer, p_lifetime integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $set_wallet_credits$
BEGIN
  IF p_value IS NULL OR 0 > p_value THEN RAISE EXCEPTION 'value must be non-negative'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  IF p_credit_type = 'REWARD' THEN
    UPDATE public.wallets SET reward_credits = p_value,
      lifetime_credits = COALESCE(p_lifetime, lifetime_credits), updated_at = now()
      WHERE user_id = p_user_id;
  ELSIF p_credit_type = 'PLAY' THEN
    UPDATE public.wallets SET play_credits = p_value,
      lifetime_credits = COALESCE(p_lifetime, lifetime_credits), updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'unknown credit_type';
  END IF;
END;
$set_wallet_credits$;
REVOKE ALL ON FUNCTION public.set_wallet_credits(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_wallet_credits(uuid, text, integer, integer) TO service_role;
