-- ============================================================================
-- Vereinsmitglieder — Datenmodell
-- ============================================================================
-- Design: docs/superpowers/specs/2026-08-14-vereinsmitglieder-design.md
--
-- Bewusst GETRENNT von club_users: jede aktive Zeile dort oeffnet heute das
-- Club-Portal (useClubAuth, club-booking-api, club-court-update). Mitglieder
-- duerfen dort nicht hinein — sie bekommen nur Preisvorteile.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Helfer für die Policies
-- ---------------------------------------------------------------------------
-- Bewusst SECURITY DEFINER: eine Policy, die club_users direkt abfragt, würde
-- deren eigene Policy mit auswerten (die wiederum club_users abfragt). Der
-- Helfer umgeht RLS und hält die Policies frei von Rekursion — dasselbe Muster
-- wie das bestehende get_user_club_id().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_club_user_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cu.club_id
  FROM public.club_users cu
  WHERE cu.user_id = auth.uid()
    AND cu.is_active
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.my_club_user_club_id() TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 1. club_memberships — genau EIN Verein pro Nutzer (UNIQUE als Invariante)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id     uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,
  -- NULL = unbefristet; sonst gilt die Mitgliedschaft bis EINSCHLIESSLICH dieses Tages
  valid_until date,
  -- Wer hat die Rolle vergeben: Admin-Menue, Club-Portal oder eingeloeste Einladung
  source      text NOT NULL DEFAULT 'admin',
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_memberships_user_unique UNIQUE (user_id),
  CONSTRAINT club_memberships_source_valid CHECK (source IN ('admin', 'club', 'invite'))
);

COMMENT ON TABLE public.club_memberships IS
  'Vereinsmitgliedschaft eines Spielers. Genau ein Verein pro Nutzer. Kein Club-Portal-Zugang (das ist club_users).';

CREATE INDEX IF NOT EXISTS club_memberships_club_idx ON public.club_memberships (club_id);

DROP TRIGGER IF EXISTS update_club_memberships_updated_at ON public.club_memberships;
CREATE TRIGGER update_club_memberships_updated_at
  BEFORE UPDATE ON public.club_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage club memberships" ON public.club_memberships;
CREATE POLICY "Admins can manage club memberships"
  ON public.club_memberships FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Members can view their own membership" ON public.club_memberships;
CREATE POLICY "Members can view their own membership"
  ON public.club_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Club-Portal-Nutzer (manager + staff) sehen die Mitglieder ihres Vereins.
-- Schreibzugriff laeuft ueber die RPCs in 20260814140000, nicht ueber RLS.
DROP POLICY IF EXISTS "Club users can view their club members" ON public.club_memberships;
CREATE POLICY "Club users can view their club members"
  ON public.club_memberships FOR SELECT
  USING (club_id = public.my_club_user_club_id());


-- Ab hier existiert club_memberships — jetzt kann der zweite Helfer angelegt werden.
CREATE OR REPLACE FUNCTION public.my_membership_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.club_id
  FROM public.club_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.is_active
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.my_membership_club_id() TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2. club_member_terms — die mit dem Verein vereinbarten Konditionen (1:1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_member_terms (
  club_id                  uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,

  -- Heimatverein-Kondition: entweder ein Abzug ODER feste Mitgliederpreise je Dauer
  home_mode                text    NOT NULL DEFAULT 'discount',
  home_discount_cents      integer NOT NULL DEFAULT 0,
  home_price_60_cents      integer,
  home_price_90_cents      integer,
  home_price_120_cents     integer,

  -- Fremde P2G-Courts: fixer Abzug vom Externenpreis (10 EUR)
  away_discount_cents      integer NOT NULL DEFAULT 1000,

  -- Gemeinsames Monatslimit fuer verguenstigte Padel-Buchungen. NULL = unbegrenzt.
  monthly_discount_limit   integer,

  -- Duerfen Mitglieder das Freikontingent des Vereins anzapfen?
  quota_enabled            boolean NOT NULL DEFAULT false,
  -- Pro-Kopf-Deckel in Minuten pro Monat (0 = kein Kontingent fuer Mitglieder)
  quota_minutes_per_member integer NOT NULL DEFAULT 0,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_member_terms_home_mode_valid
    CHECK (home_mode IN ('discount', 'fixed')),
  CONSTRAINT club_member_terms_non_negative
    CHECK (
      home_discount_cents >= 0
      AND away_discount_cents >= 0
      AND quota_minutes_per_member >= 0
      AND (monthly_discount_limit IS NULL OR monthly_discount_limit >= 0)
      AND (home_price_60_cents  IS NULL OR home_price_60_cents  >= 0)
      AND (home_price_90_cents  IS NULL OR home_price_90_cents  >= 0)
      AND (home_price_120_cents IS NULL OR home_price_120_cents >= 0)
    ),
  -- Festpreis-Modus ohne einen einzigen hinterlegten Preis waere eine stille Falle:
  -- es wuerde still der Externenpreis gelten. Mindestens 60 Minuten muss gesetzt sein.
  CONSTRAINT club_member_terms_fixed_needs_price
    CHECK (home_mode <> 'fixed' OR home_price_60_cents IS NOT NULL)
);

COMMENT ON TABLE public.club_member_terms IS
  'Je Verein vereinbarte Mitglieder-Konditionen: Heim-Rabatt oder Festpreise, Fremd-Rabatt, Monatslimit, Freikontingent-Freigabe.';

DROP TRIGGER IF EXISTS update_club_member_terms_updated_at ON public.club_member_terms;
CREATE TRIGGER update_club_member_terms_updated_at
  BEFORE UPDATE ON public.club_member_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.club_member_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage member terms" ON public.club_member_terms;
CREATE POLICY "Admins can manage member terms"
  ON public.club_member_terms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Der Verein darf seine eigenen Konditionen lesen (Anzeige im Club-Portal),
-- aendern darf sie nur der Admin — es sind ausgehandelte Vertragswerte.
DROP POLICY IF EXISTS "Club users can view their member terms" ON public.club_member_terms;
CREATE POLICY "Club users can view their member terms"
  ON public.club_member_terms FOR SELECT
  USING (club_id = public.my_club_user_club_id());

-- Das Mitglied selbst darf die Konditionen seines Vereins lesen (Checkout-Hinweis).
DROP POLICY IF EXISTS "Members can view their club terms" ON public.club_member_terms;
CREATE POLICY "Members can view their club terms"
  ON public.club_member_terms FOR SELECT
  USING (club_id = public.my_membership_club_id());

-- Jeder bestehende Verein bekommt Standardkonditionen, damit im Admin nie ein
-- leerer Datensatz steht (10 EUR Fremd-Rabatt, kein Heim-Rabatt, kein Kontingent).
INSERT INTO public.club_member_terms (club_id)
SELECT c.id FROM public.clubs c
ON CONFLICT (club_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. club_member_invites — Einladungen auf E-Mail-Adressen ohne Konto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_member_invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  -- Immer kleingeschrieben gespeichert; der Abgleich beim Login ist case-insensitiv.
  email            text NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  invited_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_member_invites_status_valid CHECK (status IN ('pending', 'accepted', 'revoked')),
  CONSTRAINT club_member_invites_email_lower CHECK (email = lower(email)),
  CONSTRAINT club_member_invites_email_shape CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

COMMENT ON TABLE public.club_member_invites IS
  'Offene Mitglieds-Einladungen des Vereins. Wird beim naechsten Login des Kontos automatisch zur Mitgliedschaft.';

-- Nur EINE offene Einladung je Verein und Adresse; erledigte Einladungen bleiben als Historie.
CREATE UNIQUE INDEX IF NOT EXISTS club_member_invites_pending_unique
  ON public.club_member_invites (club_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS club_member_invites_email_idx
  ON public.club_member_invites (email)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_club_member_invites_updated_at ON public.club_member_invites;
CREATE TRIGGER update_club_member_invites_updated_at
  BEFORE UPDATE ON public.club_member_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.club_member_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage member invites" ON public.club_member_invites;
CREATE POLICY "Admins can manage member invites"
  ON public.club_member_invites FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Lesen ja, schreiben ueber invite_club_members(): das Anlegen muss pruefen, ob
-- zur Adresse schon ein Konto existiert — dafuer braucht es SECURITY DEFINER.
DROP POLICY IF EXISTS "Club users can view their invites" ON public.club_member_invites;
CREATE POLICY "Club users can view their invites"
  ON public.club_member_invites FOR SELECT
  USING (club_id = public.my_club_user_club_id());


-- ---------------------------------------------------------------------------
-- 4. bookings — welcher Verein hat welchen Rabatt ausgeloest?
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS member_club_id        uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_scope          text,
  ADD COLUMN IF NOT EXISTS member_discount_cents integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_member_scope_valid'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_member_scope_valid
      CHECK (member_scope IS NULL OR member_scope IN ('home', 'away'));
  END IF;
END $$;

COMMENT ON COLUMN public.bookings.member_discount_cents IS
  'Tatsaechlich gewaehrter Mitgliederrabatt in Cent. > 0 zaehlt gegen das Monatslimit.';

-- Zaehlindex fuer das Monatslimit: nur verguenstigte Buchungen sind relevant.
CREATE INDEX IF NOT EXISTS bookings_member_discount_idx
  ON public.bookings (user_id, start_time)
  WHERE member_discount_cents > 0;


-- ---------------------------------------------------------------------------
-- 5. club_quota_ledger — Pro-Kopf-Deckel beim Freikontingent
-- ---------------------------------------------------------------------------
ALTER TABLE public.club_quota_ledger
  ADD COLUMN IF NOT EXISTS member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Verbraucht ein Mitglied selbst Kontingent, gibt es keinen Club-Owner. Die Spalte
-- war NOT NULL, weil bisher ausschliesslich das Club-Portal gebucht hat.
ALTER TABLE public.club_quota_ledger ALTER COLUMN club_owner_id DROP NOT NULL;

COMMENT ON COLUMN public.club_quota_ledger.member_user_id IS
  'Gesetzt, wenn ein Vereinsmitglied selbst Kontingent verbraucht hat (NULL = Buchung durch das Club-Portal).';

CREATE INDEX IF NOT EXISTS club_quota_ledger_member_idx
  ON public.club_quota_ledger (member_user_id, month_start_date)
  WHERE member_user_id IS NOT NULL;

-- Mitglieder duerfen ihre eigenen Kontingent-Buchungen sehen (Anzeige "dein Anteil").
DROP POLICY IF EXISTS "Members can view their own quota usage" ON public.club_quota_ledger;
CREATE POLICY "Members can view their own quota usage"
  ON public.club_quota_ledger FOR SELECT
  USING (member_user_id = auth.uid());
