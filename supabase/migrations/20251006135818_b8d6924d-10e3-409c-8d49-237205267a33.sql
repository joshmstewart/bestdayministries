-- Add aspect_ratio column to featured_items
ALTER TABLE featured_items ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9';

COMMENT ON COLUMN featured_items.aspect_ratio IS 'Aspect ratio of the cropped image (e.g., 16:9, 1:1, 9:16)';