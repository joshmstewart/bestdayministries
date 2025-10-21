-- Add use_default_rarity column to sticker_collections
ALTER TABLE sticker_collections
ADD COLUMN use_default_rarity boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN sticker_collections.use_default_rarity IS 'When true, collection uses default rarity percentages from app_settings instead of custom values';
