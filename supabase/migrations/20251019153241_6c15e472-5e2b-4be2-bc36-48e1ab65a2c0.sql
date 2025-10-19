-- Add custom pack asset fields to sticker_collections
ALTER TABLE sticker_collections 
ADD COLUMN IF NOT EXISTS pack_image_url TEXT,
ADD COLUMN IF NOT EXISTS pack_animation_url TEXT;