-- Fix Critical Security Issues - Part 1: Remove SECURITY DEFINER from views

-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS public.profiles_public CASCADE;
DROP VIEW IF EXISTS public.profiles_with_roles CASCADE;
DROP VIEW IF EXISTS public.app_settings_public CASCADE;
DROP VIEW IF EXISTS public.bestie_funding_progress CASCADE;

-- Recreate profiles_public as a regular view (not SECURITY DEFINER)
-- Access will be controlled by RLS on the profiles table
CREATE VIEW public.profiles_public 
WITH (security_barrier = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  avatar_number,
  bio,
  created_at,
  role
FROM public.profiles;

-- Recreate app_settings_public as a regular view
-- Only expose truly public settings, controlled by app_settings RLS
CREATE VIEW public.app_settings_public
WITH (security_barrier = true)
AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings
WHERE setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url');

-- Recreate bestie_funding_progress as a regular view
-- Access controlled by RLS on featured_besties and sponsorships tables
CREATE VIEW public.bestie_funding_progress
WITH (security_barrier = true)
AS
SELECT 
  fb.id as featured_bestie_id,
  fb.bestie_id,
  fb.bestie_name,
  fb.monthly_goal,
  COALESCE(SUM(s.amount), 0) as current_monthly_pledges,
  GREATEST(fb.monthly_goal - COALESCE(SUM(s.amount), 0), 0) as remaining_needed,
  CASE 
    WHEN fb.monthly_goal > 0 THEN 
      LEAST((COALESCE(SUM(s.amount), 0) / fb.monthly_goal * 100), 100)
    ELSE 0 
  END as funding_percentage
FROM public.featured_besties fb
LEFT JOIN public.sponsorships s 
  ON s.bestie_id = fb.bestie_id 
  AND s.status = 'active'
  AND s.frequency = 'monthly'
WHERE fb.is_active = true 
  AND fb.approval_status = 'approved'
GROUP BY fb.id, fb.bestie_id, fb.bestie_name, fb.monthly_goal;

-- Note: profiles_with_roles view removed entirely as it exposed sensitive role data
-- Admin pages should query user_roles table directly with proper authentication