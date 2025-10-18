-- Add default_rarity_percentages to app_settings if not exists
INSERT INTO app_settings (setting_key, setting_value, updated_at)
VALUES (
  'default_rarity_percentages',
  '{"common": 50, "uncommon": 30, "rare": 15, "epic": 4, "legendary": 1}'::jsonb,
  NOW()
)
ON CONFLICT (setting_key) DO NOTHING;