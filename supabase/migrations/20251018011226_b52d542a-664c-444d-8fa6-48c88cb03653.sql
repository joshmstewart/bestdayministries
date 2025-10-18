-- Add rarity percentages configuration to sticker collections
ALTER TABLE sticker_collections
ADD COLUMN rarity_percentages JSONB DEFAULT '{
  "common": 50,
  "uncommon": 30,
  "rare": 15,
  "epic": 4,
  "legendary": 1
}'::jsonb;

COMMENT ON COLUMN sticker_collections.rarity_percentages IS 'Custom rarity drop rate percentages for this collection';