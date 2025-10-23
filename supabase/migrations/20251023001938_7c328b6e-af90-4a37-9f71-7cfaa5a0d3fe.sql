-- Add new event types for sticker rarity levels
INSERT INTO app_sound_effects (event_type, is_enabled, volume)
VALUES 
  ('sticker_reveal_common', false, 0.5),
  ('sticker_reveal_uncommon', false, 0.5),
  ('sticker_reveal_rare', false, 0.5),
  ('sticker_reveal_epic', false, 0.5),
  ('sticker_reveal_legendary', false, 0.5)
ON CONFLICT (event_type) DO NOTHING;

-- Update the existing sticker_pack_open to be more descriptive
UPDATE app_sound_effects 
SET event_type = 'sticker_pack_reveal' 
WHERE event_type = 'sticker_pack_open';

-- Remove old sticker_reveal since we're splitting by rarity
DELETE FROM app_sound_effects WHERE event_type = 'sticker_reveal';