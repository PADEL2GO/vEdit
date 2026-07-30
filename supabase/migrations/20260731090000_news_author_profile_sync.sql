-- Autoren können mit einem Account verknüpft werden: das Profilbild aus
-- profiles.avatar_url wird dann automatisch übernommen und bleibt synchron
-- (Trigger in beide Richtungen — materialisiert, damit anonyme Leser es sehen).

ALTER TABLE public.news_authors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Beim Anlegen/Verknüpfen eines Autors das Account-Bild ziehen
CREATE OR REPLACE FUNCTION public.news_author_pull_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_avatar TEXT;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT avatar_url INTO profile_avatar FROM public.profiles WHERE user_id = NEW.user_id;
    IF profile_avatar IS NOT NULL AND profile_avatar <> '' THEN
      NEW.avatar_url := profile_avatar;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_author_pull_avatar ON public.news_authors;
CREATE TRIGGER trg_news_author_pull_avatar
  BEFORE INSERT OR UPDATE ON public.news_authors
  FOR EACH ROW EXECUTE FUNCTION public.news_author_pull_avatar();

-- Wenn der User sein Profilbild ändert, alle verknüpften Autoren mitziehen
CREATE OR REPLACE FUNCTION public.news_author_sync_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.news_authors
    SET avatar_url = NEW.avatar_url
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_author_sync_from_profile ON public.profiles;
CREATE TRIGGER trg_news_author_sync_from_profile
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.news_author_sync_from_profile();

-- Florians Autor-Eintrag mit seinem Account verknüpfen (zieht das Profilbild sofort)
UPDATE public.news_authors
SET user_id = (SELECT id FROM auth.users WHERE email = 'fsteinfelder@padel2go.eu')
WHERE name = 'Florian Steinfelder' AND user_id IS NULL;
