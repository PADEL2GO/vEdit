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
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  UNIQUE (campaign_id, subscriber_id)
);
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

-- 4. RLS: admin-only (edge functions use service role, which bypasses RLS)
CREATE POLICY "Admins manage newsletter campaigns" ON public.newsletter_campaigns
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins read newsletter sends" ON public.newsletter_sends
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

-- Next batch of eligible subscribers not yet logged for this campaign.
CREATE OR REPLACE FUNCTION public.newsletter_next_batch(p_campaign_id uuid, p_limit int)
RETURNS TABLE (id uuid, email text, unsubscribe_token uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.email, s.unsubscribe_token
  FROM public.newsletter_subscribers s
  WHERE s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.newsletter_sends ns WHERE ns.campaign_id = p_campaign_id AND ns.subscriber_id = s.id)
  ORDER BY s.created_at
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.newsletter_bump_counters(p_campaign_id uuid, p_sent int, p_failed int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.newsletter_campaigns
  SET sent_count = sent_count + p_sent, failed_count = failed_count + p_failed
  WHERE id = p_campaign_id;
$$;
