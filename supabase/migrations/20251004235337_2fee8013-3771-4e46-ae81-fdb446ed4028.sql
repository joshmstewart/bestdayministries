-- Add stripe_mode setting (defaults to 'test')
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('stripe_mode', '"test"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;