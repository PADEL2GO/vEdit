-- Marketplace Items Tabelle
CREATE TABLE public.marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('booking', 'equipment', 'physio', 'other')),
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
  description TEXT,
  partner_name TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS für marketplace_items
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace items" 
ON public.marketplace_items 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage marketplace items" 
ON public.marketplace_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Marketplace Redemptions Tabelle
CREATE TABLE public.marketplace_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id),
  credit_cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  reference_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS für marketplace_redemptions
ALTER TABLE public.marketplace_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" 
ON public.marketplace_redemptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions" 
ON public.marketplace_redemptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Trigger für updated_at bei marketplace_items
CREATE TRIGGER update_marketplace_items_updated_at
BEFORE UPDATE ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed einige Demo-Items
INSERT INTO public.marketplace_items (name, category, credit_cost, description, partner_name, sort_order) VALUES
('Freibuchung 60 Min', 'booking', 500, 'Eine kostenlose Court-Buchung für 60 Minuten', 'Padel2Go', 1),
('Freibuchung 90 Min', 'booking', 700, 'Eine kostenlose Court-Buchung für 90 Minuten', 'Padel2Go', 2),
('Padel Schläger Rabatt 20%', 'equipment', 300, '20% Rabatt auf einen Padel-Schläger deiner Wahl', 'Padel Point', 3),
('Griffband Set (3 Stück)', 'equipment', 100, 'Set mit 3 hochwertigen Griffbändern', 'Padel Point', 4),
('Physio Session 30 Min', 'physio', 400, '30-minütige Physio-Behandlung', 'PhysioPartner', 5),
('Getränke Flatrate Event', 'other', 200, 'Getränke-Flatrate bei einem P2G Event', 'Red Bull', 6);