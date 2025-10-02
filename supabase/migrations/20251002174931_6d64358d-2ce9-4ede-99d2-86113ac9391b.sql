-- Recreate the view with SECURITY INVOKER to fix the security warning
CREATE OR REPLACE VIEW public.app_settings_public 
WITH (security_invoker=true) AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings
WHERE setting_key = ANY (ARRAY['logo_url'::text, 'mobile_app_name'::text, 'mobile_app_icon_url'::text]);