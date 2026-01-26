-- Add price columns to content_announcements
ALTER TABLE public.content_announcements 
ADD COLUMN IF NOT EXISTS price_coins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.content_announcements.price_coins IS 'Price in coins for the announced item (0 if free)';
COMMENT ON COLUMN public.content_announcements.is_free IS 'Whether the announced item is free';