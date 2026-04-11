-- Add slug and featured fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS venue_name TEXT,
ADD COLUMN IF NOT EXISTS location_url TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_idx ON public.events(slug) WHERE slug IS NOT NULL;

-- Create trigger function to auto-generate slug from title
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Only generate if slug is null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Create base slug from title
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    new_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = new_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      new_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS generate_event_slug_trigger ON public.events;
CREATE TRIGGER generate_event_slug_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_event_slug();

-- Generate slugs for existing events
UPDATE public.events 
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'events_page',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Only admins can view subscribers
CREATE POLICY "Admins can view newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete subscribers
CREATE POLICY "Admins can delete newsletter subscribers"
  ON public.newsletter_subscribers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));