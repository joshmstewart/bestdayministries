-- Create enum for vendor team roles
CREATE TYPE public.vendor_team_role AS ENUM ('owner', 'admin', 'staff');

-- Create vendor_team_members table
CREATE TABLE public.vendor_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role vendor_team_role NOT NULL DEFAULT 'staff',
  invited_by uuid,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Enable RLS
ALTER TABLE public.vendor_team_members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is on vendor team
CREATE OR REPLACE FUNCTION public.is_vendor_team_member(_user_id uuid, _vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_team_members
    WHERE user_id = _user_id
      AND vendor_id = _vendor_id
      AND accepted_at IS NOT NULL
  )
$$;

-- Check if user is vendor owner (original or team owner)
CREATE OR REPLACE FUNCTION public.is_vendor_owner(_user_id uuid, _vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Original owner from vendors table
    SELECT 1 FROM public.vendors WHERE id = _vendor_id AND user_id = _user_id
    UNION
    -- Team member with owner role
    SELECT 1 FROM public.vendor_team_members 
    WHERE vendor_id = _vendor_id 
      AND user_id = _user_id 
      AND role = 'owner'
      AND accepted_at IS NOT NULL
  )
$$;

-- Check if user is vendor admin (owner or admin role)
CREATE OR REPLACE FUNCTION public.is_vendor_admin(_user_id uuid, _vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Original owner from vendors table
    SELECT 1 FROM public.vendors WHERE id = _vendor_id AND user_id = _user_id
    UNION
    -- Team member with owner or admin role
    SELECT 1 FROM public.vendor_team_members 
    WHERE vendor_id = _vendor_id 
      AND user_id = _user_id 
      AND role IN ('owner', 'admin')
      AND accepted_at IS NOT NULL
  )
$$;

-- Get user's vendor ID (for any vendor they're part of)
CREATE OR REPLACE FUNCTION public.get_user_vendor_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First check if they're the original owner
    (SELECT id FROM public.vendors WHERE user_id = _user_id LIMIT 1),
    -- Then check if they're a team member
    (SELECT vendor_id FROM public.vendor_team_members 
     WHERE user_id = _user_id AND accepted_at IS NOT NULL LIMIT 1)
  )
$$;

-- RLS policies for vendor_team_members
CREATE POLICY "Vendor owners and admins can view team members"
ON public.vendor_team_members
FOR SELECT
USING (
  is_vendor_admin(auth.uid(), vendor_id) OR 
  user_id = auth.uid() OR
  has_admin_access(auth.uid())
);

CREATE POLICY "Vendor owners can add team members"
ON public.vendor_team_members
FOR INSERT
WITH CHECK (
  is_vendor_owner(auth.uid(), vendor_id) OR
  has_admin_access(auth.uid())
);

CREATE POLICY "Vendor owners can update team members"
ON public.vendor_team_members
FOR UPDATE
USING (
  is_vendor_owner(auth.uid(), vendor_id) OR
  has_admin_access(auth.uid())
);

CREATE POLICY "Vendor owners can remove team members"
ON public.vendor_team_members
FOR DELETE
USING (
  is_vendor_owner(auth.uid(), vendor_id) OR
  user_id = auth.uid() OR -- Users can remove themselves
  has_admin_access(auth.uid())
);

-- Admins can view all
CREATE POLICY "Admins can view all team members"
ON public.vendor_team_members
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_team_members_updated_at
BEFORE UPDATE ON public.vendor_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing vendor owners to team members table
INSERT INTO public.vendor_team_members (vendor_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner'::vendor_team_role, created_at
FROM public.vendors
WHERE user_id IS NOT NULL
ON CONFLICT (vendor_id, user_id) DO NOTHING;