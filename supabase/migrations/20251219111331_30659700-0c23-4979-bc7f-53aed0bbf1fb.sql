-- Phase 1: Extend events table with new columns
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'party',
ADD COLUMN IF NOT EXISTS price_label text,
ADD COLUMN IF NOT EXISTS price_cents integer,
ADD COLUMN IF NOT EXISTS capacity integer,
ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}';

-- Create event_artists table
CREATE TABLE IF NOT EXISTS public.event_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'DJ',
  image_url text,
  instagram_url text,
  spotify_url text,
  website_url text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create event_brands table
CREATE TABLE IF NOT EXISTS public.event_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_type text NOT NULL DEFAULT 'sponsor',
  logo_url text,
  website_url text,
  instagram_url text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_artists
CREATE POLICY "Admins can manage event_artists"
ON public.event_artists
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view artists of published events"
ON public.event_artists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_artists.event_id 
    AND events.is_published = true
  )
);

-- RLS Policies for event_brands
CREATE POLICY "Admins can manage event_brands"
ON public.event_brands
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view brands of published events"
ON public.event_brands
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_brands.event_id 
    AND events.is_published = true
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_artists_event_id ON public.event_artists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_brands_event_id ON public.event_brands(event_id);