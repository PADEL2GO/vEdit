-- Eingeloggte User dürfen ihre eigenen Likes lesen, damit der Like-Zustand
-- geräteübergreifend aus der DB kommt (statt nur aus localStorage).
-- Schreiben bleibt exklusiv bei der Edge Function news-like (Service-Role).
DROP POLICY IF EXISTS "Users read own likes" ON public.news_likes;
CREATE POLICY "Users read own likes"
  ON public.news_likes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
