-- Fix foreign key constraint to allow sticker deletion
-- Drop the existing foreign key constraint
ALTER TABLE daily_scratch_cards
DROP CONSTRAINT IF EXISTS daily_scratch_cards_revealed_sticker_id_fkey;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE daily_scratch_cards
ADD CONSTRAINT daily_scratch_cards_revealed_sticker_id_fkey
FOREIGN KEY (revealed_sticker_id)
REFERENCES stickers(id)
ON DELETE SET NULL;