-- ========================================
-- SECURITY FIX: Restrict Profile Visibility
-- Prevent email enumeration and unauthorized data access
-- ========================================

-- Step 1: Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Step 2: Create restrictive policies for profile viewing

-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins/owners can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Linked caregivers can view their besties' profiles
CREATE POLICY "Caregivers can view linked besties profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = profiles.id
  )
);

-- Besties can view their linked caregivers' profiles
CREATE POLICY "Besties can view linked caregivers profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE bestie_id = auth.uid()
      AND caregiver_id = profiles.id
  )
);

-- Step 3: Create a public profiles view without sensitive data
-- This can be used for public-facing features like discussion authors
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  display_name,
  bio,
  avatar_url,
  avatar_number,
  role,
  created_at
  -- NOTE: email, friend_code, and other sensitive fields are excluded
FROM public.profiles;

-- Enable RLS on the public view
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Allow anyone to view the public profiles view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;