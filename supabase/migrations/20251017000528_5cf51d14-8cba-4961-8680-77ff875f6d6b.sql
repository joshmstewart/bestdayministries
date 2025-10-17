-- Add newsletter header and footer settings to app_settings
INSERT INTO app_settings (setting_key, setting_value) 
VALUES 
  ('newsletter_header', '{"enabled": false, "html": "<div style=\"text-align: center; padding: 20px; background-color: #f8f9fa;\"><h1 style=\"margin: 0; color: #333;\">Best Day Ministries Newsletter</h1></div>"}'::jsonb),
  ('newsletter_footer', '{"enabled": false, "html": "<div style=\"text-align: center; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6;\"><p style=\"margin: 0; color: #666;\">Follow us on social media</p></div>"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;