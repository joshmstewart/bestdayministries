-- Add preview_sticker_id to sticker_collections table
ALTER TABLE sticker_collections
ADD COLUMN preview_sticker_id uuid REFERENCES stickers(id) ON DELETE SET NULL;

COMMENT ON COLUMN sticker_collections.preview_sticker_id IS 'The sticker to display as preview on community page button';