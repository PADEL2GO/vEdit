
-- Table for partner tile customization on the homepage
CREATE TABLE public.partner_tiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  bg_color text DEFAULT '#FFFFFF',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_tiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view active partner tiles (public marketing content)
CREATE POLICY "Anyone can view active partner tiles"
  ON public.partner_tiles
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage partner tiles
CREATE POLICY "Admins can manage partner tiles"
  ON public.partner_tiles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_partner_tiles_updated_at
  BEFORE UPDATE ON public.partner_tiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
