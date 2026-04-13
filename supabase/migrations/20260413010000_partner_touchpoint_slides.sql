CREATE TABLE IF NOT EXISTS partner_touchpoint_slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE partner_touchpoint_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active touchpoint slides" ON partner_touchpoint_slides
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage touchpoint slides" ON partner_touchpoint_slides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
