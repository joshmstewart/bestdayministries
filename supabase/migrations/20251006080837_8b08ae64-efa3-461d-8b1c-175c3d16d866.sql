-- Create user permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

-- Create index for faster permission lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_type ON public.user_permissions(permission_type);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Admins can grant permissions
CREATE POLICY "Admins can grant permissions"
  ON public.user_permissions
  FOR INSERT
  WITH CHECK (has_admin_access(auth.uid()));

-- Admins can revoke permissions
CREATE POLICY "Admins can revoke permissions"
  ON public.user_permissions
  FOR DELETE
  USING (has_admin_access(auth.uid()));

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission_type = _permission_type
  )
$$;

-- Create helper function to check if user can moderate
CREATE OR REPLACE FUNCTION public.can_moderate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_admin_access(_user_id) OR has_permission(_user_id, 'moderate')
$$;