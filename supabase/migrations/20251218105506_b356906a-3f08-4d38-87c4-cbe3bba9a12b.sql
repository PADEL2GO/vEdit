-- =====================================================
-- Phase 1: Database Foundations for Admin Dashboard
-- =====================================================

-- 1.1 Extend locations table with new columns
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_24_7 boolean NOT NULL DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS country text DEFAULT 'DE';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lng numeric;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS main_image_url text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS gallery_image_urls text[] DEFAULT '{}';

-- 1.2 Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  address_line1 text,
  postal_code text,
  city text,
  start_at timestamptz,
  end_at timestamptz,
  image_url text,
  ticket_url text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_events_location_id ON public.events(location_id);
CREATE INDEX idx_events_is_published ON public.events(is_published);
CREATE INDEX idx_events_start_at ON public.events(start_at);

-- 1.3 RLS Policies for events
-- Anyone can view published events (Frontend)
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (is_published = true);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert events
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.4 Update RLS for locations (is_online filter)
-- Drop existing policy that allows anyone to view all locations
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;

-- New policy: Only online locations for non-admins, all for admins
CREATE POLICY "Anyone can view online locations"
  ON public.locations FOR SELECT
  USING (
    is_online = true 
    OR public.has_role(auth.uid(), 'admin')
  );

-- 1.5 Trigger for events.updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure locations also has the trigger
DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.6 Storage bucket for media (locations and events images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for media bucket
CREATE POLICY "Anyone can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Admins can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );

-- 1.7 Set existing locations to is_online = true so they remain visible
UPDATE public.locations SET is_online = true WHERE is_online = false;