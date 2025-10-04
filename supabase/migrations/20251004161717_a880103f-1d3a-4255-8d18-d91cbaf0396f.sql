-- Add carousel timing settings to app_settings
INSERT INTO app_settings (setting_key, setting_value)
VALUES 
  ('carousel_timing_featured_item', '{"interval_ms": 10000}'::jsonb),
  ('carousel_timing_featured_bestie', '{"interval_ms": 5000}'::jsonb),
  ('carousel_timing_sponsor_bestie', '{"interval_ms": 7000}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;