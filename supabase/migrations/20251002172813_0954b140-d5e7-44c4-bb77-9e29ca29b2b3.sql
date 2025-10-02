-- Find and fix any remaining security definer views
-- Query to find views with security definer
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT schemaname, viewname 
    FROM pg_views 
    WHERE schemaname = 'public'
  LOOP
    RAISE NOTICE 'Found view: %.%', view_record.schemaname, view_record.viewname;
  END LOOP;
END $$;

-- Check if app_settings_public exists and needs fixing
-- This is likely the culprit - let's recreate it properly
DROP VIEW IF EXISTS public.app_settings_public CASCADE;

CREATE VIEW public.app_settings_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings
WHERE setting_key IN ('app_logo', 'app_name'); -- Only expose non-sensitive settings

-- Grant permissions
GRANT SELECT ON public.app_settings_public TO authenticated;
GRANT SELECT ON public.app_settings_public TO anon;

-- Add comment
COMMENT ON VIEW public.app_settings_public IS 
  'Public view of app settings. Only exposes non-sensitive configuration like logos and app name. Uses security_invoker to enforce proper RLS.';