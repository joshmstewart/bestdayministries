-- Fix user_stickers unique constraint to include collection_id
-- This allows the same sticker to exist in multiple collections

-- Drop the existing constraint that only considers user_id and sticker_id
ALTER TABLE user_stickers 
DROP CONSTRAINT IF EXISTS user_stickers_user_id_sticker_id_key;

-- Add new unique constraint that includes collection_id
ALTER TABLE user_stickers
ADD CONSTRAINT user_stickers_user_id_sticker_id_collection_id_key 
UNIQUE (user_id, sticker_id, collection_id);