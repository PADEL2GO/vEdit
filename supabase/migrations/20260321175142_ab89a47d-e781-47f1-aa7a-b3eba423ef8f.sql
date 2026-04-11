
CREATE TABLE public.skypadel_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.skypadel_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gallery" ON public.skypadel_gallery
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active gallery" ON public.skypadel_gallery
  FOR SELECT TO public
  USING (is_active = true);
