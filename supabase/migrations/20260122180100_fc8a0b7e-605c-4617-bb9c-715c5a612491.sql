-- Add personal best time tracking rewards to coin_rewards_settings
INSERT INTO coin_rewards_settings (reward_key, reward_name, description, coins_amount, category, is_active)
VALUES 
  ('memory_match_pb_easy', 'Memory Match - Personal Best (Easy)', 'Beat your personal best time on Easy difficulty', 50, 'games', true),
  ('memory_match_pb_medium', 'Memory Match - Personal Best (Medium)', 'Beat your personal best time on Medium difficulty', 75, 'games', true),
  ('memory_match_pb_hard', 'Memory Match - Personal Best (Hard)', 'Beat your personal best time on Hard difficulty', 100, 'games', true)
ON CONFLICT (reward_key) DO NOTHING;