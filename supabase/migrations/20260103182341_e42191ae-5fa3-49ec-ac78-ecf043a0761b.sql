-- Insert store access control setting (default to 'open')
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('store_access_mode', '"open"')
ON CONFLICT (setting_key) DO NOTHING;