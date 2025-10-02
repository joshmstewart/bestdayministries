-- Update remaining storage policies to use the simplified naming
-- App Assets
DROP POLICY IF EXISTS "Admins and owners can upload app assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update app assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete app assets" ON storage.objects;

CREATE POLICY "Admins can upload app assets" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'app-assets' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update app assets" ON storage.objects
FOR UPDATE USING (bucket_id = 'app-assets' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete app assets" ON storage.objects
FOR DELETE USING (bucket_id = 'app-assets' AND has_admin_access(auth.uid()));

-- Avatars storage
DROP POLICY IF EXISTS "Admins and owners can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete avatars" ON storage.objects;

CREATE POLICY "Admins can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND has_admin_access(auth.uid()));

-- Update discussion posts policy
DROP POLICY IF EXISTS "Guardians, admins and owners can create posts" ON public.discussion_posts;

CREATE POLICY "Guardians and admins can create posts" ON public.discussion_posts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('caregiver', 'admin', 'owner')
  )
);