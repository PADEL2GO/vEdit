-- =============================================================================
-- Events: ticket_url is now OPTIONAL. Events without an external ticket link are
-- booked in-app (free registration) — no external payer. register_for_event no
-- longer rejects priced events (there is no external link to send them to); the
-- price stays informational until in-app event payment exists.
-- =============================================================================

ALTER TABLE public.events ALTER COLUMN ticket_url DROP NOT NULL;

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

  SELECT id, is_published, capacity, registrations_count
  INTO ev
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR NOT ev.is_published THEN
    RAISE EXCEPTION 'Event nicht gefunden';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = p_event_id AND user_id = v_user AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Du bist bereits für dieses Event angemeldet';
  END IF;

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
