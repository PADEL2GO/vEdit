-- =============================================================================
-- In-app event registration (Phase 1: FREE events only — paid events keep their
-- external ticket_url). Adds event_registrations + a denormalized registrations_count
-- on events (RLS-safe spots-left for the public list) + atomic register/cancel RPCs
-- with capacity enforcement and a generated ticket code.
-- =============================================================================

-- Denormalized confirmed-registration count → readable via the normal events select
-- so the client can show "X frei" without exposing other users' registrations.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registrations_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_code text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);

-- One active registration per user per event.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_event_reg_active
  ON public.event_registrations(event_id, user_id) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_event_reg_user ON public.event_registrations(user_id, status);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own registrations" ON public.event_registrations;
CREATE POLICY "users view own registrations" ON public.event_registrations
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
-- Writes go exclusively through the SECURITY DEFINER RPCs below (capacity-safe).

-- ── register_for_event: atomic, capacity-checked, free-events-only ───────────
CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $reg$
DECLARE
  v_user uuid := auth.uid();
  ev record;
  v_code text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  SELECT id, is_published, price_cents, capacity, registrations_count, start_at
  INTO ev
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR NOT ev.is_published THEN
    RAISE EXCEPTION 'Event nicht gefunden';
  END IF;

  -- Phase 1: only free events can be booked in-app.
  IF COALESCE(ev.price_cents, 0) > 0 THEN
    RAISE EXCEPTION 'Dieses Event kann nur über den externen Ticket-Link gebucht werden';
  END IF;

  -- Already registered?
  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = p_event_id AND user_id = v_user AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Du bist bereits für dieses Event angemeldet';
  END IF;

  -- Capacity (null = unlimited).
  IF ev.capacity IS NOT NULL AND ev.registrations_count >= ev.capacity THEN
    RAISE EXCEPTION 'Dieses Event ist ausgebucht';
  END IF;

  v_code := 'P2G-EV-' || upper(substr(md5(random()::text || p_event_id::text || v_user::text), 1, 6));

  INSERT INTO public.event_registrations (event_id, user_id, ticket_code)
  VALUES (p_event_id, v_user, v_code)
  RETURNING id INTO v_id;

  UPDATE public.events
  SET registrations_count = registrations_count + 1
  WHERE id = p_event_id;

  RETURN jsonb_build_object('registration_id', v_id, 'ticket_code', v_code);
END;
$reg$;

REVOKE ALL ON FUNCTION public.register_for_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid) TO authenticated;

-- ── cancel_event_registration: idempotent, frees the spot ────────────────────
CREATE OR REPLACE FUNCTION public.cancel_event_registration(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cancel$
DECLARE
  v_user uuid := auth.uid();
  v_reg uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  -- Lock the event row so the count decrement races cleanly with registers.
  PERFORM 1 FROM public.events WHERE id = p_event_id FOR UPDATE;

  SELECT id INTO v_reg
  FROM public.event_registrations
  WHERE event_id = p_event_id AND user_id = v_user AND status = 'confirmed'
  LIMIT 1;

  IF v_reg IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.event_registrations
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = v_reg;

  UPDATE public.events
  SET registrations_count = GREATEST(0, registrations_count - 1)
  WHERE id = p_event_id;

  RETURN true;
END;
$cancel$;

REVOKE ALL ON FUNCTION public.cancel_event_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_event_registration(uuid) TO authenticated;
