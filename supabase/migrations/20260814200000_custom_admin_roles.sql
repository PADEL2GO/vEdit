-- ============================================================================
-- Eigene Admin-Rollen mit seitengenauem Zugriff
-- ============================================================================
-- Bisher gab es nur "Volladmin oder gar nichts". Jetzt kann ein Volladmin
-- eigene Rollen anlegen (z. B. "Redaktion") und ihnen einzelne Admin-Seiten
-- freigeben. Wer eine solche Rolle hat, sieht und erreicht ausschliesslich
-- diese Seiten.
--
-- Der schwierige Teil ist nicht das Menue, sondern die Daten: 94 RLS-Policies
-- auf 66 Tabellen haengen an has_role(uid,'admin'). Ohne Gegenmassnahme koennte
-- eine eigene Rolle die Seite zwar oeffnen, aber nichts laden oder speichern.
-- Deshalb erzeugt diese Migration je Seite ZUSAETZLICHE Policies auf den
-- Tabellen dieser Seite. Bestehende Policies werden nicht angefasst — Policies
-- werden in Postgres mit ODER verknuepft, das Verhalten fuer Volladmins bleibt
-- damit bitgenau gleich.
--
-- Sicherheitsanker: eine neue Rolle hat NULL Seiten. Zugriff entsteht
-- ausschliesslich dadurch, dass ein Volladmin eine Seite bewusst zuweist.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. admin_pages — der Katalog aller Admin-Seiten
-- ---------------------------------------------------------------------------
-- is_delegatable = false: Seiten, die niemals an eine eigene Rolle gehen.
-- "Nutzer" enthaelt die Rollenvergabe selbst — wer sie bekaeme, koennte sich
-- zum Volladmin machen. Einstellungen, Integrationen und Features haengen an
-- API-Schluesseln, Feature-Schaltern und Loeschfunktionen.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_pages (
  key            text PRIMARY KEY,
  label          text NOT NULL,
  route          text NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  is_delegatable boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.admin_pages IS
  'Katalog der Admin-Seiten. is_delegatable=false bleibt Volladmins vorbehalten.';

INSERT INTO public.admin_pages (key, label, route, sort_order, is_delegatable) VALUES
  ('overview',           'Übersicht',        '/admin',                    10,  true),
  ('bookings',           'Buchungen',        '/admin/bookings',           20,  true),
  ('courts',             'Standorte & Courts','/admin/courts',            30,  true),
  ('pricing',            'Preise & Punkte',  '/admin/pricing',            40,  true),
  ('utilization',        'Auslastung',       '/admin/utilization',        50,  true),
  ('analytics',          'Analytics',        '/admin/analytics',          60,  true),
  ('clubs',              'Clubs',            '/admin/clubs',              70,  true),
  ('club-owners',        'Club-Owner',       '/admin/club-owners',        80,  true),
  ('news',               'News',             '/admin/news',               90,  true),
  ('events',             'Events',           '/admin/events',            100,  true),
  ('marketplace',        'Marketplace',      '/admin/marketplace',       110,  true),
  ('newsletter',         'Newsletter',       '/admin/newsletter',        120,  true),
  ('vouchers',           'Gutscheine',       '/admin/vouchers',          130,  true),
  ('notifications',      'Mitteilungen',     '/admin/notifications',     140,  true),
  ('p2g-points',         'P2G-Punkte',       '/admin/p2g-points',        150,  true),
  ('visuals',            'Visuals',          '/admin/visuals',           160,  true),
  ('farben',             'Farben',           '/admin/farben',            170,  true),
  ('partner-tiles',      'Partner-Kacheln',  '/admin/partner-tiles',     180,  true),
  ('location-teasers',   'Standort-Teaser',  '/admin/location-teasers',  190,  true),
  ('touchpoint-slides',  'Touchpoint-Slides','/admin/touchpoint-slides', 200,  true),
  ('skypadel-gallery',   'SkyPadel-Galerie', '/admin/skypadel-gallery',  210,  true),
  ('qr-panel',           'QR-Panel',         '/admin/qr-panel',          220,  true),
  ('users',              'Nutzer',           '/admin/users',             900, false),
  ('roles',              'Rollen & Rechte',  '/admin/roles',             905, false),
  ('settings',           'Einstellungen',    '/admin/settings',          910, false),
  ('integrations',       'Integrationen',    '/admin/integrations',      920, false),
  ('features',           'Features',         '/admin/features',          930, false)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      route = EXCLUDED.route,
      sort_order = EXCLUDED.sort_order,
      is_delegatable = EXCLUDED.is_delegatable;


-- ---------------------------------------------------------------------------
-- 2. admin_roles / admin_role_pages / user_admin_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admin_roles_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.admin_role_pages (
  role_id  uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  page_key text NOT NULL REFERENCES public.admin_pages(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, page_key)
);

CREATE TABLE IF NOT EXISTS public.user_admin_roles (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS user_admin_roles_user_idx ON public.user_admin_roles (user_id);

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Nicht delegierbare Seiten koennen gar nicht erst zugewiesen werden — als
-- Datenbank-Invariante, nicht als UI-Konvention.
CREATE OR REPLACE FUNCTION public.enforce_delegatable_page()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_pages ap
    WHERE ap.key = NEW.page_key AND ap.is_delegatable
  ) THEN
    RAISE EXCEPTION 'page_not_delegatable: %', NEW.page_key;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_delegatable_page_trg ON public.admin_role_pages;
CREATE TRIGGER enforce_delegatable_page_trg
  BEFORE INSERT OR UPDATE ON public.admin_role_pages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_delegatable_page();


-- ---------------------------------------------------------------------------
-- 3. has_admin_page() — die eine Pruefung, ueberall verwendet
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: wird innerhalb von Policies aufgerufen und muss die
-- Rollentabellen lesen koennen, ohne selbst in RLS zu laufen.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_admin_page(p_user uuid, p_page text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_admin_roles uar
    JOIN public.admin_roles ar       ON ar.id = uar.role_id AND ar.is_active
    JOIN public.admin_role_pages arp ON arp.role_id = uar.role_id
    WHERE uar.user_id = p_user
      AND arp.page_key = p_page
  );
$$;

COMMENT ON FUNCTION public.has_admin_page(uuid, text) IS
  'Hat der Nutzer ueber eine eigene Admin-Rolle Zugriff auf diese Seite?';

GRANT EXECUTE ON FUNCTION public.has_admin_page(uuid, text) TO authenticated, service_role;


-- Welche Seiten darf ICH? Volladmin bekommt alle, sonst die zugewiesenen.
CREATE OR REPLACE FUNCTION public.my_admin_pages()
RETURNS TABLE (page_key text, label text, route text, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ap.key, ap.label, ap.route, ap.sort_order
  FROM public.admin_pages ap
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_admin_page(auth.uid(), ap.key)
  ORDER BY ap.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.my_admin_pages() TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. RLS auf den Rollentabellen: verwalten darf nur der Volladmin
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read the page catalog" ON public.admin_pages;
CREATE POLICY "Anyone signed in can read the page catalog"
  ON public.admin_pages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage the page catalog" ON public.admin_pages;
CREATE POLICY "Admins manage the page catalog"
  ON public.admin_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage admin roles" ON public.admin_roles;
CREATE POLICY "Admins manage admin roles"
  ON public.admin_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage role pages" ON public.admin_role_pages;
CREATE POLICY "Admins manage role pages"
  ON public.admin_role_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage user role assignments" ON public.user_admin_roles;
CREATE POLICY "Admins manage user role assignments"
  ON public.user_admin_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Der Rolleninhaber darf sehen, welche Rollen er selbst hat.
DROP POLICY IF EXISTS "Users see their own admin roles" ON public.user_admin_roles;
CREATE POLICY "Users see their own admin roles"
  ON public.user_admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Role holders can read their roles" ON public.admin_roles;
CREATE POLICY "Role holders can read their roles"
  ON public.admin_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_admin_roles uar
    WHERE uar.role_id = admin_roles.id AND uar.user_id = auth.uid()
  ));


-- ---------------------------------------------------------------------------
-- 5. admin_page_tables — welche Tabellen gehoeren zu welcher Seite?
-- ---------------------------------------------------------------------------
-- access = 'write': volle Rechte auf der Tabelle, wenn die Seite zugewiesen ist
-- access = 'read' : nur lesen. Bewusst fuer alles, was fremde Personendaten
--                   enthaelt (profiles, wallets, points_ledger, Belege) —
--                   eine Redaktionsrolle soll Namen sehen, aber keine
--                   Guthaben verschieben koennen.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_page_tables (
  page_key   text NOT NULL REFERENCES public.admin_pages(key) ON DELETE CASCADE,
  table_name text NOT NULL,
  access     text NOT NULL DEFAULT 'write',
  PRIMARY KEY (page_key, table_name),
  CONSTRAINT admin_page_tables_access_valid CHECK (access IN ('read', 'write'))
);

ALTER TABLE public.admin_page_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read page table map" ON public.admin_page_tables;
CREATE POLICY "Admins read page table map"
  ON public.admin_page_tables FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DELETE FROM public.admin_page_tables;
INSERT INTO public.admin_page_tables (page_key, table_name, access) VALUES
  -- Übersicht / Auswertungen: ausschliesslich lesend
  ('overview','bookings','read'), ('overview','marketplace_redemptions','read'),
  ('overview','receipts','read'), ('overview','profiles','read'),
  ('overview','locations','read'), ('overview','courts','read'),

  ('analytics','bookings','read'), ('analytics','profiles','read'),
  ('analytics','marketplace_redemptions','read'), ('analytics','receipts','read'),
  ('analytics','locations','read'), ('analytics','courts','read'),

  ('utilization','bookings','read'), ('utilization','courts','read'),
  ('utilization','locations','read'),

  -- Betrieb
  ('bookings','bookings','write'),
  ('bookings','locations','read'), ('bookings','courts','read'), ('bookings','profiles','read'),

  ('courts','courts','write'), ('courts','locations','write'),
  ('courts','court_prices','write'), ('courts','camera_api_keys','write'),
  ('courts','camera_sessions','read'),

  ('pricing','court_prices','write'), ('pricing','court_pricing_bands','write'),
  ('pricing','site_settings','write'),
  ('pricing','courts','read'), ('pricing','locations','read'),

  ('clubs','clubs','write'), ('clubs','club_court_assignments','write'),
  ('clubs','club_users','write'), ('clubs','club_member_terms','write'),
  ('clubs','club_memberships','write'), ('clubs','club_member_invites','write'),
  ('clubs','courts','read'), ('clubs','locations','read'), ('clubs','profiles','read'),

  ('club-owners','club_owner_assignments','write'),
  ('club-owners','club_quota_ledger','read'), ('club-owners','clubs','read'),
  ('club-owners','courts','read'), ('club-owners','profiles','read'),

  -- Inhalte
  ('news','articles','write'), ('news','news_authors','write'),
  ('news','news_writing_styles','write'), ('news','media','write'),
  ('news','news_likes','read'),

  ('events','events','write'), ('events','event_artists','write'),
  ('events','event_brands','write'), ('events','media','write'),
  ('events','locations','read'),

  ('marketplace','marketplace_items','write'), ('marketplace','marketplace_item_images','write'),
  ('marketplace','marketplace_returns','write'), ('marketplace','media','write'),
  ('marketplace','marketplace_redemptions','read'), ('marketplace','receipts','read'),
  ('marketplace','profiles','read'),

  ('newsletter','newsletter_campaigns','write'), ('newsletter','media','write'),
  ('newsletter','newsletter_subscribers','read'),

  ('vouchers','voucher_codes','write'),

  ('notifications','admin_broadcasts','write'), ('notifications','profiles','read'),

  ('p2g-points','expert_levels_config','write'), ('p2g-points','site_settings','write'),
  ('p2g-points','wallets','read'), ('p2g-points','points_ledger','read'),
  ('p2g-points','profiles','read'),

  -- Gestaltung
  ('visuals','site_visuals','write'), ('visuals','media','write'),
  ('farben','site_visuals','write'),
  ('partner-tiles','partner_tiles','write'), ('partner-tiles','media','write'),
  ('location-teasers','location_teasers','write'), ('location-teasers','media','write'),
  ('location-teasers','locations','read'),
  ('touchpoint-slides','partner_touchpoint_slides','write'), ('touchpoint-slides','media','write'),
  ('skypadel-gallery','skypadel_gallery','write'), ('skypadel-gallery','media','write'),
  ('qr-panel','media','write'), ('qr-panel','locations','read');


-- ---------------------------------------------------------------------------
-- 6. Generator: je Eintrag oben eine ZUSAETZLICHE Policy
-- ---------------------------------------------------------------------------
-- Bestehende Policies bleiben unberuehrt. Fehlt eine Tabelle (Altbestand,
-- Umbenennung), wird sie uebersprungen statt die Migration zu kippen.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_admin_page_policies()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $sync$
DECLARE
  r       record;
  v_name  text;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT page_key, table_name, access
    FROM public.admin_page_tables
    ORDER BY page_key, table_name
  LOOP
    CONTINUE WHEN to_regclass('public.' || quote_ident(r.table_name)) IS NULL;

    v_name := 'admin_page_' || r.page_key || '_' || r.access;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_name, r.table_name);

    IF r.access = 'write' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
           USING (public.has_admin_page(auth.uid(), %L))
           WITH CHECK (public.has_admin_page(auth.uid(), %L))',
        v_name, r.table_name, r.page_key, r.page_key);
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
           USING (public.has_admin_page(auth.uid(), %L))',
        v_name, r.table_name, r.page_key);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$sync$;

COMMENT ON FUNCTION public.sync_admin_page_policies() IS
  'Erzeugt die zusaetzlichen Seiten-Policies aus admin_page_tables. Nach Aenderungen an der Zuordnung erneut aufrufen.';

REVOKE ALL ON FUNCTION public.sync_admin_page_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_page_policies() TO service_role;

SELECT public.sync_admin_page_policies();
