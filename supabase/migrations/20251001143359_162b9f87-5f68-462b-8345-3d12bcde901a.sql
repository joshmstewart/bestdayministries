-- Fix the security definer view issue by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.app_settings_public;

CREATE VIEW public.app_settings_public 
WITH (security_invoker=true)
AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings;

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public.app_settings_public TO authenticated, anon;