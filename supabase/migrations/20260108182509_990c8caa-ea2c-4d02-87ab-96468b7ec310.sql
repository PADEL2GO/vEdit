-- Fix security definer view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.lobby_stats;

CREATE OR REPLACE VIEW public.lobby_stats 
WITH (security_invoker = true)
AS
SELECT 
  l.id as lobby_id,
  l.status,
  l.capacity,
  COUNT(lm.id) FILTER (WHERE lm.status IN ('joined', 'paid', 'reserved')) as members_count,
  COUNT(lm.id) FILTER (WHERE lm.status = 'paid') as paid_count,
  COUNT(lm.id) FILTER (WHERE lm.status = 'reserved' AND lm.reserved_until > now()) as reserved_count,
  COALESCE(
    ROUND(AVG(ss.skill_level) FILTER (WHERE lm.status IN ('joined', 'paid')), 1),
    l.skill_min
  ) as avg_skill
FROM public.lobbies l
LEFT JOIN public.lobby_members lm ON l.id = lm.lobby_id
LEFT JOIN public.skill_stats ss ON lm.user_id = ss.user_id
GROUP BY l.id;