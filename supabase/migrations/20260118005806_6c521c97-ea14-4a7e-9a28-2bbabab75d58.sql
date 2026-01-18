-- Create a security definer function to check if user owns a vendor
CREATE OR REPLACE FUNCTION public.user_owns_vendor(p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendors
    WHERE id = p_vendor_id
    AND user_id = auth.uid()
  );
$$;

-- Drop and recreate RLS policies using the new function
DROP POLICY IF EXISTS "Vendors can insert their own story media" ON vendor_story_media;
DROP POLICY IF EXISTS "Vendors can update their own story media" ON vendor_story_media;
DROP POLICY IF EXISTS "Vendors can delete their own story media" ON vendor_story_media;

-- INSERT policy
CREATE POLICY "Vendors can insert their own story media"
ON vendor_story_media
FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_vendor(vendor_id));

-- UPDATE policy
CREATE POLICY "Vendors can update their own story media"
ON vendor_story_media
FOR UPDATE
TO authenticated
USING (public.user_owns_vendor(vendor_id))
WITH CHECK (public.user_owns_vendor(vendor_id));

-- DELETE policy
CREATE POLICY "Vendors can delete their own story media"
ON vendor_story_media
FOR DELETE
TO authenticated
USING (public.user_owns_vendor(vendor_id));