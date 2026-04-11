-- Add product_type to marketplace_items
ALTER TABLE public.marketplace_items 
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'rental';

-- Add check constraint for product_type
ALTER TABLE public.marketplace_items 
ADD CONSTRAINT marketplace_items_product_type_check 
CHECK (product_type IN ('rental', 'purchase'));

-- Add shipping address fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN shipping_address_line1 TEXT,
ADD COLUMN shipping_postal_code TEXT,
ADD COLUMN shipping_city TEXT,
ADD COLUMN shipping_country TEXT DEFAULT 'DE';

-- Add shipping address and fulfillment status to marketplace_redemptions
ALTER TABLE public.marketplace_redemptions 
ADD COLUMN shipping_address_line1 TEXT,
ADD COLUMN shipping_postal_code TEXT,
ADD COLUMN shipping_city TEXT,
ADD COLUMN shipping_country TEXT,
ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for fulfillment_status
ALTER TABLE public.marketplace_redemptions 
ADD CONSTRAINT marketplace_redemptions_fulfillment_status_check 
CHECK (fulfillment_status IN ('pending', 'shipped', 'delivered', 'cancelled'));

-- Add index for fulfillment status queries
CREATE INDEX idx_marketplace_redemptions_fulfillment_status 
ON public.marketplace_redemptions(fulfillment_status);

-- Add index for product type queries
CREATE INDEX idx_marketplace_items_product_type 
ON public.marketplace_items(product_type);