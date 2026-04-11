ALTER TABLE public.partner_tiles
  ADD COLUMN partner_type text NOT NULL DEFAULT 'equipment',
  ADD COLUMN region text,
  ADD COLUMN description text;