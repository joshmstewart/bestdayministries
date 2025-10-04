-- Security Fix: Remove SECURITY DEFINER from views to prevent RLS bypass
-- These views should use SECURITY INVOKER so they respect the querying user's RLS policies

-- Drop and recreate app_settings_public view with SECURITY INVOKER
-- This view should only expose public settings
DROP VIEW IF EXISTS public.app_settings_public;

CREATE OR REPLACE VIEW public.app_settings_public 
WITH (security_invoker=true) AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings
WHERE setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url');

-- Drop and recreate profiles_public view with SECURITY INVOKER
-- This view exposes basic profile info but should respect RLS
DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=true) AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.avatar_number,
  p.friend_code,
  p.created_at,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id;

-- Add comment explaining the security considerations
COMMENT ON VIEW public.app_settings_public IS 'Public app settings view - uses SECURITY INVOKER to respect RLS policies. Only exposes whitelisted public settings.';
COMMENT ON VIEW public.profiles_public IS 'Public profiles view - uses SECURITY INVOKER to respect RLS policies. Combines profile and role data.';