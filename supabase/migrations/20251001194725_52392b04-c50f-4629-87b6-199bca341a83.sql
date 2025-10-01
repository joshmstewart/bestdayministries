-- Drop and recreate the public view to fix caching issues
DROP VIEW IF EXISTS app_settings_public;

CREATE VIEW app_settings_public AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM app_settings;

-- Grant access to everyone
GRANT SELECT ON app_settings_public TO anon, authenticated;