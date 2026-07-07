-- Newsletter: double opt-in + unsubscribe on subscribers, plus campaigns + per-send log.

-- 1. Extend subscribers
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirm_token     uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at   timestamptz;

-- Grandfather existing subscribers as confirmed (they opted in before double opt-in existed).
UPDATE public.newsletter_subscribers SET confirmed_at = created_at WHERE confirmed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsub_token_idx   ON public.newsletter_subscribers (unsubscribe_token);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx ON public.newsletter_subscribers (confirm_token);

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         text NOT NULL,
  preheader       text,
  blocks          jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'draft',
  recipient_count int  NOT NULL DEFAULT 0,
  sent_count      int  NOT NULL DEFAULT 0,
  failed_count    int  NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- 3. Per-recipient send log (idempotency)
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  email         text NOT NULL,
  status        text NOT NULL,
  error         text,
  attempts      int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  UNIQUE (campaign_id, subscriber_id)
);
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
-- Idempotent: ensure `attempts` exists even if newsletter_sends was created by an earlier partial apply.
ALTER TABLE public.newsletter_sends ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;

-- 4. RLS: admin-only (edge functions use service role, which bypasses RLS)
DROP POLICY IF EXISTS "Admins manage newsletter campaigns" ON public.newsletter_campaigns;
DROP POLICY IF EXISTS "Admins read newsletter sends" ON public.newsletter_sends;
CREATE POLICY "Admins manage newsletter campaigns" ON public.newsletter_campaigns
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins read newsletter sends" ON public.newsletter_sends
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

-- Drop any pre-hardening helpers from an earlier partial apply (they lacked the anon lockdown).
DROP FUNCTION IF EXISTS public.newsletter_next_batch(uuid, int);
DROP FUNCTION IF EXISTS public.newsletter_bump_counters(uuid, int, int);

-- Atomically select up to p_limit eligible subscribers (confirmed, not unsubscribed, not
-- yet 'sent', and not given up after 3 attempts) for this campaign AND claim them in the
-- same statement: insert a fresh 'pending' row, or re-arm a prior 'failed'/'pending' row
-- with attempts+1. Returns the claimed rows with their unsubscribe token. Single RPC so
-- there is no separate unchecked claim step to race or stall on.
CREATE OR REPLACE FUNCTION public.newsletter_claim_batch(p_campaign_id uuid, p_limit int)
RETURNS TABLE (subscriber_id uuid, email text, unsubscribe_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- The OUT columns (subscriber_id/email/unsubscribe_token) share names with table columns;
-- resolve any bare reference to the COLUMN (else e.g. ON CONFLICT (subscriber_id) errors 42702).
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT s.id, s.email
    FROM public.newsletter_subscribers s
    WHERE s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL
      AND EXISTS (SELECT 1 FROM public.newsletter_campaigns c WHERE c.id = p_campaign_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.newsletter_sends ns
        WHERE ns.campaign_id = p_campaign_id AND ns.subscriber_id = s.id
          AND (ns.status = 'sent' OR ns.attempts >= 3)
      )
    ORDER BY s.created_at
    LIMIT p_limit
  ),
  claimed AS (
    INSERT INTO public.newsletter_sends (campaign_id, subscriber_id, email, status, attempts)
    SELECT p_campaign_id, e.id, e.email, 'pending', 1 FROM eligible e
    ON CONFLICT (campaign_id, subscriber_id)
      DO UPDATE SET status = 'pending', attempts = public.newsletter_sends.attempts + 1, error = NULL
    RETURNING newsletter_sends.subscriber_id AS sid
  )
  SELECT s.id, s.email, s.unsubscribe_token
  FROM claimed c JOIN public.newsletter_subscribers s ON s.id = c.sid;
END;
$$;

-- Live progress: refresh sent_count mid-run (absolute count, race-free).
CREATE OR REPLACE FUNCTION public.newsletter_progress(p_campaign_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.newsletter_campaigns
  SET sent_count = (SELECT count(*) FROM public.newsletter_sends WHERE campaign_id = p_campaign_id AND status = 'sent')
  WHERE id = p_campaign_id;
$$;

-- Finalize once no eligible subscribers remain: absolute counts + terminal status.
-- failed_count = subscribers we permanently gave up on (failed with attempts >= 3).
CREATE OR REPLACE FUNCTION public.newsletter_finalize(p_campaign_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.newsletter_campaigns SET
    sent_count   = (SELECT count(*) FROM public.newsletter_sends WHERE campaign_id = p_campaign_id AND status = 'sent'),
    failed_count = (SELECT count(*) FROM public.newsletter_sends WHERE campaign_id = p_campaign_id AND status = 'failed' AND attempts >= 3),
    status       = 'sent',
    sent_at      = now()
  WHERE id = p_campaign_id;
$$;

-- SECURITY DEFINER functions must NOT be callable by anon/authenticated (repo convention):
-- otherwise the anon key could dump the subscriber list + unsubscribe tokens via PostgREST.
REVOKE ALL ON FUNCTION public.newsletter_claim_batch(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.newsletter_progress(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.newsletter_finalize(uuid)         FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_claim_batch(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.newsletter_progress(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION public.newsletter_finalize(uuid)         TO service_role;
