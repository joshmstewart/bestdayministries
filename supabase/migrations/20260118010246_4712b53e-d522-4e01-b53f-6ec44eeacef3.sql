-- Expand vendor_story_media write access to include accepted team members and admins/owners

-- Helper: is the current user an admin/owner?
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'owner')
  );
$$;

-- Helper: can the current user manage the given vendor?
CREATE OR REPLACE FUNCTION public.user_can_manage_vendor(p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Vendor record owner
    EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = p_vendor_id
        AND v.user_id = auth.uid()
    )
    OR
    -- Accepted team member
    EXISTS (
      SELECT 1
      FROM public.vendor_team_members tm
      WHERE tm.vendor_id = p_vendor_id
        AND tm.user_id = auth.uid()
        AND tm.accepted_at IS NOT NULL
    )
    OR
    -- Admin/Owner override
    public.is_admin_or_owner()
  );
$$;

-- Replace write policies to use user_can_manage_vendor
DROP POLICY IF EXISTS "Vendors can insert their own story media" ON public.vendor_story_media;
DROP POLICY IF EXISTS "Vendors can update their own story media" ON public.vendor_story_media;
DROP POLICY IF EXISTS "Vendors can delete their own story media" ON public.vendor_story_media;

CREATE POLICY "Vendors can insert their own story media"
ON public.vendor_story_media
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_manage_vendor(vendor_id));

CREATE POLICY "Vendors can update their own story media"
ON public.vendor_story_media
FOR UPDATE
TO authenticated
USING (public.user_can_manage_vendor(vendor_id))
WITH CHECK (public.user_can_manage_vendor(vendor_id));

CREATE POLICY "Vendors can delete their own story media"
ON public.vendor_story_media
FOR DELETE
TO authenticated
USING (public.user_can_manage_vendor(vendor_id));
