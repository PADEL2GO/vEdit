-- Create site_visuals table for managing website images
CREATE TABLE public.site_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  placeholder_url TEXT DEFAULT '/placeholder.svg',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_visuals ENABLE ROW LEVEL SECURITY;

-- Public read access (for website)
CREATE POLICY "Anyone can view site visuals"
ON public.site_visuals FOR SELECT
USING (true);

-- Admins can manage all operations
CREATE POLICY "Admins can manage site visuals"
ON public.site_visuals FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_site_visuals_updated_at
BEFORE UPDATE ON public.site_visuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial visual entries

-- Team visuals
INSERT INTO public.site_visuals (key, label, category, description) VALUES
('ueber-uns.team.florian-steinfelder', 'Florian Steinfelder Portrait', 'Team', 'Portrait des Managing Partners Florian Steinfelder auf der Über Uns Seite'),
('ueber-uns.team.david-klemm', 'David Klemm Portrait', 'Team', 'Portrait des Managing Partners David Klemm auf der Über Uns Seite');

-- FuerVereine: Model Steps
INSERT INTO public.site_visuals (key, label, category, description) VALUES
('fuer-vereine.modell.step-1', 'Schritt 1: Fläche identifizieren', 'Modell für Vereine', 'Bild für Schritt 1 im Vereins-Modell'),
('fuer-vereine.modell.step-2', 'Schritt 2: Court aufbauen', 'Modell für Vereine', 'Bild für Schritt 2 im Vereins-Modell'),
('fuer-vereine.modell.step-3', 'Schritt 3: Booking aktivieren', 'Modell für Vereine', 'Bild für Schritt 3 im Vereins-Modell'),
('fuer-vereine.modell.step-4', 'Schritt 4: Revenue-Share', 'Modell für Vereine', 'Bild für Schritt 4 im Vereins-Modell'),
('fuer-vereine.modell.step-5', 'Schritt 5: Loyalty & League', 'Modell für Vereine', 'Bild für Schritt 5 im Vereins-Modell'),
('fuer-vereine.modell.step-6', 'Schritt 6: KI-Kamera & Training', 'Modell für Vereine', 'Bild für Schritt 6 im Vereins-Modell');

-- FuerVereine: Digital Ecosystem
INSERT INTO public.site_visuals (key, label, category, description) VALUES
('fuer-vereine.oekosystem.app-booking', 'App-Booking', 'Digitales Ökosystem', 'Bild für App-Booking Feature'),
('fuer-vereine.oekosystem.score-tracking', 'Score-Tracking', 'Digitales Ökosystem', 'Bild für Score-Tracking Feature'),
('fuer-vereine.oekosystem.league-circuit', 'League & Circuit', 'Digitales Ökosystem', 'Bild für League & Circuit Feature'),
('fuer-vereine.oekosystem.loyalty-rewards', 'Loyalty & Rewards', 'Digitales Ökosystem', 'Bild für Loyalty & Rewards Feature');

-- FuerVereine: KI-Kamera
INSERT INTO public.site_visuals (key, label, category, description) VALUES
('fuer-vereine.ki-kamera', 'KI-Kamera System', 'KI-Kamera', 'Hauptbild für die KI-Kamera Sektion auf der Für Vereine Seite');