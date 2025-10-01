-- Create security definer function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- Drop existing policies for featured_besties
DROP POLICY IF EXISTS "Admins and owners can insert featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins and owners can update featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins and owners can delete featured besties" ON public.featured_besties;

-- Recreate policies using the security definer function
CREATE POLICY "Admins and owners can insert featured besties"
ON public.featured_besties
FOR INSERT
WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins and owners can update featured besties"
ON public.featured_besties
FOR UPDATE
USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins and owners can delete featured besties"
ON public.featured_besties
FOR DELETE
USING (public.is_admin_or_owner(auth.uid()));