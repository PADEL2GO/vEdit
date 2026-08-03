-- Punkterabatt-Doku: Jede Bestellung dokumentiert den Punktestand des Users
-- unmittelbar VOR und NACH der Punkte-Reservierung (im selben Txn-Snapshot wie
-- der Debit selbst — nie nachträglich gelesen). NULL = Gast bzw. kein Wallet.
ALTER TABLE public.marketplace_redemptions
  ADD COLUMN IF NOT EXISTS points_balance_before integer,
  ADD COLUMN IF NOT EXISTS points_balance_after integer;

-- insert_marketplace_order: unverändert zur 20260702-Version, plus Balance-Snapshots.
CREATE OR REPLACE FUNCTION public.insert_marketplace_order(p_order jsonb, p_reserve integer DEFAULT 0)
RETURNS TABLE (order_id uuid, play_reserved integer, reward_reserved integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mp_insert_order$
DECLARE
  v_user   uuid := NULLIF(p_order->>'user_id', '')::uuid;
  v_item   uuid := (p_order->>'item_id')::uuid;
  v_id     uuid;
  v_play   integer := 0;
  v_reward integer := 0;
  v_before integer := NULL;
  v_after  integer := NULL;
BEGIN
  IF v_user IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_item::text, 0));

    IF EXISTS (
      SELECT 1 FROM public.marketplace_redemptions
      WHERE user_id = v_user
        AND item_id = v_item
        AND (
          (status = 'pending' AND (hold_expires_at IS NULL OR hold_expires_at > now()))
          OR (status = 'success' AND created_at > now() - interval '2 minutes')
        )
    ) THEN
      RETURN;
    END IF;

    SELECT play_credits + reward_credits INTO v_before
    FROM public.wallets WHERE user_id = v_user;
  END IF;

  IF v_user IS NOT NULL AND COALESCE(p_reserve, 0) > 0 THEN
    SELECT r.play_spent, r.reward_spent INTO v_play, v_reward
    FROM public.reserve_points(v_user, p_reserve) AS r;
  END IF;

  IF v_user IS NOT NULL THEN
    SELECT play_credits + reward_credits INTO v_after
    FROM public.wallets WHERE user_id = v_user;
  END IF;

  INSERT INTO public.marketplace_redemptions
  SELECT * FROM jsonb_populate_record(NULL::public.marketplace_redemptions, p_order)
  RETURNING id INTO v_id;

  UPDATE public.marketplace_redemptions
  SET play_spent   = v_play,
      reward_spent = v_reward,
      credit_cost  = v_play + v_reward,
      points_balance_before = v_before,
      points_balance_after  = COALESCE(v_after, v_before)
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, v_play, v_reward;
END;
$mp_insert_order$;

REVOKE ALL ON FUNCTION public.insert_marketplace_order(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_marketplace_order(jsonb, integer) TO service_role;
