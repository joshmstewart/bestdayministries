
-- Add original_image_url column to featured_items for recropping support
ALTER TABLE featured_items ADD COLUMN IF NOT EXISTS original_image_url TEXT;

COMMENT ON COLUMN featured_items.original_image_url IS 'Original unprocessed image URL for recropping';
