-- Add stickers_per_pack column to sticker_collections table
ALTER TABLE sticker_collections 
ADD COLUMN stickers_per_pack integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN sticker_collections.stickers_per_pack IS 'Number of stickers revealed when opening a pack from this collection';