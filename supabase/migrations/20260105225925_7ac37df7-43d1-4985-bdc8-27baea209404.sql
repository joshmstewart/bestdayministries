-- Add is_purchasable column to memory_match_packs
ALTER TABLE memory_match_packs 
ADD COLUMN IF NOT EXISTS is_purchasable boolean DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN memory_match_packs.is_purchasable IS 'If true, pack must be purchased. If false, pack is available to all users by default.';