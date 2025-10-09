-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This resolves the Supabase linter error about views with SECURITY DEFINER

-- Drop existing views
DROP VIEW IF EXISTS public.app_settings_public CASCADE;
DROP VIEW IF EXISTS public.profiles_public CASCADE;
DROP VIEW IF EXISTS public.bestie_funding_progress CASCADE;

-- Recreate app_settings_public with SECURITY INVOKER
CREATE VIEW public.app_settings_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings
WHERE setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url', 'sponsor_page_content');

-- Recreate profiles_public with SECURITY INVOKER
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  bio,
  avatar_url,
  avatar_number,
  friend_code,
  email,
  created_at,
  updated_at
FROM public.profiles;

-- Recreate bestie_funding_progress with SECURITY INVOKER
CREATE VIEW public.bestie_funding_progress 
WITH (security_invoker = true)
AS
SELECT 
  fb.id AS featured_bestie_id,
  fb.bestie_id,
  fb.bestie_name,
  fb.monthly_goal,
  COALESCE(SUM(s.amount), 0) AS current_monthly_pledges,
  GREATEST(fb.monthly_goal - COALESCE(SUM(s.amount), 0), 0) AS remaining_needed,
  CASE 
    WHEN fb.monthly_goal > 0 THEN 
      LEAST(ROUND((COALESCE(SUM(s.amount), 0) / fb.monthly_goal * 100)::numeric, 2), 100)
    ELSE 0 
  END AS funding_percentage
FROM public.featured_besties fb
LEFT JOIN public.sponsorships s ON s.bestie_id = fb.bestie_id 
  AND s.status = 'active' 
  AND s.frequency = 'monthly'
GROUP BY fb.id, fb.bestie_id, fb.bestie_name, fb.monthly_goal;

-- Grant appropriate permissions
GRANT SELECT ON public.app_settings_public TO authenticated, anon;
GRANT SELECT ON public.profiles_public TO authenticated, anon;
GRANT SELECT ON public.bestie_funding_progress TO authenticated, anon;

-- Add comments explaining the security model
COMMENT ON VIEW public.app_settings_public IS 
  'Public view of app settings. Uses security_invoker to run with caller permissions, showing only public settings as filtered by RLS.';

COMMENT ON VIEW public.profiles_public IS 
  'Public view of profiles. Uses security_invoker to run with caller permissions, relying on RLS policies on profiles table for access control.';

COMMENT ON VIEW public.bestie_funding_progress IS 
  'View showing funding progress for featured besties. Uses security_invoker to enforce RLS policies from underlying tables.';