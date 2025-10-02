-- ========================================
-- CRITICAL SECURITY FIX: Separate User Roles Table
-- This prevents privilege escalation attacks
-- ========================================

-- Step 1: Create user_roles table with strict access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role, created_at
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Create SECURITY DEFINER functions to check roles safely
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update has_admin_access to use user_roles table
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- Update is_owner to use user_roles table
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- Step 4: Create strict RLS policies for user_roles
-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins/owners can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Only owners can insert/update/delete roles
CREATE POLICY "Only owners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Only owners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_owner(auth.uid()));

CREATE POLICY "Only owners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_owner(auth.uid()));

-- Step 5: Update handle_new_user trigger to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles without role
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = NEW.email;
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'supporter'),
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 6: Remove UPDATE permission on role column from profiles
-- First, let's make role column nullable and set a default
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'supporter'::public.user_role;

-- Update the profiles UPDATE policy to prevent role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- Role cannot be changed via this policy
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    OR role IS NULL
  )
);

-- Create a view for easy access to user profiles with roles
CREATE OR REPLACE VIEW public.profiles_with_roles AS
SELECT 
  p.*,
  ur.role as current_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;