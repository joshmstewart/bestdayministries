-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate policies using security definer functions to avoid recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Users cannot change their own role
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    OR role IS NULL
  )
);

-- Create a simpler update policy that just checks user ownership
-- without checking role changes (role changes should only be done via user_roles table)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);