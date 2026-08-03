-- 1. Payback-Satz für 90-Minuten-Buchungen (bisher fiel 90 min auf den 60er-Satz).
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payback_points_90min integer NOT NULL DEFAULT 150;

-- 2. Storno-Clawback: Das Buchungs-Payback (bookings.play_credits_awarded, gutgeschrieben
-- via increment_play_and_lifetime) wurde bei Storno/Refund bisher NIE zurückgebucht —
-- reverseBookingRewards kennt nur reward_instances. Diese RPC nimmt das Payback anteilig
-- zurück: Row-Lock + Single-Winner (dekrementiert play_credits_awarded), dadurch idempotent
-- bei doppelten Webhooks/Retries. Wallet clamped auf 0 (bereits ausgegebene Punkte erzeugen
-- keinen Negativsaldo); der Ledger-Eintrag dokumentiert die Rückbuchung.
CREATE OR REPLACE FUNCTION public.clawback_booking_payback(p_booking_id uuid, p_refund_pct integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $claw$
DECLARE
  v_awarded integer;
  v_user uuid;
  v_claw integer;
BEGIN
  SELECT play_credits_awarded, user_id INTO v_awarded, v_user
  FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND OR v_user IS NULL OR COALESCE(v_awarded, 0) <= 0 THEN
    RETURN 0;
  END IF;

  v_claw := floor(v_awarded * LEAST(GREATEST(COALESCE(p_refund_pct, 100), 0), 100) / 100.0)::integer;
  IF v_claw <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.bookings
  SET play_credits_awarded = v_awarded - v_claw
  WHERE id = p_booking_id;

  UPDATE public.wallets
  SET play_credits     = GREATEST(0, play_credits - v_claw),
      lifetime_credits = GREATEST(0, lifetime_credits - v_claw),
      updated_at       = now()
  WHERE user_id = v_user;

  PERFORM public.log_points_ledger(
    v_user, -v_claw, 'REVERSAL', 'PLAY',
    'booking_payback', p_booking_id::text, 'Storno: Buchungs-Payback zurückgebucht'
  );

  RETURN v_claw;
END;
$claw$;

REVOKE ALL ON FUNCTION public.clawback_booking_payback(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_booking_payback(uuid, integer) TO service_role;
