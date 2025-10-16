-- Add simple on/off setting for sticker feature
INSERT INTO app_settings (setting_key, setting_value, updated_by)
VALUES ('stickers_enabled', 'false', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = 'false';