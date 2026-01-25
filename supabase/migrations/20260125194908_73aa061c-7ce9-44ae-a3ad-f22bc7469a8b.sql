-- Add Memory Match Extreme Mode store item
INSERT INTO store_items (id, name, description, price, category, is_active, display_order, visible_to_roles)
VALUES (
  gen_random_uuid(),
  'Memory Match - Extreme Mode',
  'Unlock the ultimate challenge! Extreme mode features 16 pairs (32 cards) in an 8x4 grid. Only for the most skilled players!',
  250,
  'games',
  true,
  2,
  ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[]
);

-- Add coin reward settings for extreme mode
INSERT INTO coin_rewards_settings (reward_key, reward_name, coins_amount, description, is_active, category)
VALUES 
  ('memory_match_extreme', 'Memory Match - Extreme', 80, 'Complete an extreme Memory Match game', true, 'games'),
  ('memory_match_pb_extreme', 'Memory Match - Extreme PB', 150, 'Memory Match Extreme mode personal best bonus', true, 'games')
ON CONFLICT (reward_key) DO UPDATE SET
  coins_amount = EXCLUDED.coins_amount,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;