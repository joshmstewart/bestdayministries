-- Fix Security Definer View warnings
-- Set security_invoker = true on all public views to ensure they run with
-- the permissions of the calling user, not the view owner

-- Fix profiles_public view
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Fix app_settings_public view
ALTER VIEW public.app_settings_public SET (security_invoker = true);

-- Fix bestie_funding_progress view
ALTER VIEW public.bestie_funding_progress SET (security_invoker = true);

-- Fix sponsor_bestie_funding_progress view
ALTER VIEW public.sponsor_bestie_funding_progress SET (security_invoker = true);

-- Add comments documenting why security_invoker is used
COMMENT ON VIEW public.profiles_public IS 
'Public view of profiles. Uses security_invoker to run with caller permissions, relying on RLS policies on profiles table for access control.';

COMMENT ON VIEW public.app_settings_public IS 
'Public view of app settings. Uses security_invoker to run with caller permissions, showing only public settings as filtered by RLS.';

COMMENT ON VIEW public.bestie_funding_progress IS 
'View showing funding progress for featured besties. Uses security_invoker to run with caller permissions, relying on RLS policies on underlying tables.';

COMMENT ON VIEW public.sponsor_bestie_funding_progress IS 
'View showing funding progress for sponsor besties. Uses security_invoker to run with caller permissions, relying on RLS policies on underlying tables.';