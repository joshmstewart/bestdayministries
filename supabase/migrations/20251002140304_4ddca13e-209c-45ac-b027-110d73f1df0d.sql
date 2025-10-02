-- First, drop all policies that use the old function
DROP POLICY IF EXISTS "Admins and owners can insert featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins and owners can update featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins and owners can delete featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins and owners can upload featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can upload featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can create albums" ON public.albums;
DROP POLICY IF EXISTS "Admins and owners can delete albums" ON public.albums;
DROP POLICY IF EXISTS "Admins and owners can update albums" ON public.albums;
DROP POLICY IF EXISTS "Admins and owners can manage album images" ON public.album_images;
DROP POLICY IF EXISTS "Admins and owners can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can view all settings including metadata" ON public.app_settings;
DROP POLICY IF EXISTS "Admins and owners can delete avatars" ON public.avatars;
DROP POLICY IF EXISTS "Admins and owners can insert avatars" ON public.avatars;
DROP POLICY IF EXISTS "Admins and owners can update avatars" ON public.avatars;
DROP POLICY IF EXISTS "Admins can approve posts" ON public.discussion_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.discussion_posts;
DROP POLICY IF EXISTS "Admins can approve comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON public.discussion_comments;

-- Now drop the old function
DROP FUNCTION IF EXISTS public.is_admin_or_owner(uuid);

-- Create the new function with a clearer name
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
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

-- Recreate all policies with the new function and simpler naming
-- Albums
CREATE POLICY "Admins can create albums" ON public.albums
FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete albums" ON public.albums
FOR DELETE USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update albums" ON public.albums
FOR UPDATE USING (has_admin_access(auth.uid()));

-- Album Images
CREATE POLICY "Admins can manage album images" ON public.album_images
FOR ALL USING (has_admin_access(auth.uid()));

-- App Settings
CREATE POLICY "Admins can update settings" ON public.app_settings
FOR ALL USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can view all settings" ON public.app_settings
FOR SELECT USING (has_admin_access(auth.uid()));

-- Avatars
CREATE POLICY "Admins can delete avatars" ON public.avatars
FOR DELETE USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can insert avatars" ON public.avatars
FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update avatars" ON public.avatars
FOR UPDATE USING (has_admin_access(auth.uid()));

-- Discussion Posts
CREATE POLICY "Admins can approve posts" ON public.discussion_posts
FOR UPDATE USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete posts" ON public.discussion_posts
FOR DELETE USING (has_admin_access(auth.uid()));

-- Discussion Comments
CREATE POLICY "Admins can approve comments" ON public.discussion_comments
FOR UPDATE USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete comments" ON public.discussion_comments
FOR DELETE USING (has_admin_access(auth.uid()));

-- Featured Besties
CREATE POLICY "Admins can delete featured besties" ON public.featured_besties
FOR DELETE USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can insert featured besties" ON public.featured_besties
FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update featured besties" ON public.featured_besties
FOR UPDATE USING (has_admin_access(auth.uid()));

-- Storage policies
CREATE POLICY "Admins can upload featured bestie images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'featured-bestie-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update featured bestie images" ON storage.objects
FOR UPDATE USING (bucket_id = 'featured-bestie-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete featured bestie images" ON storage.objects
FOR DELETE USING (bucket_id = 'featured-bestie-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can upload featured bestie audio" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'featured-bestie-audio' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update featured bestie audio" ON storage.objects
FOR UPDATE USING (bucket_id = 'featured-bestie-audio' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete featured bestie audio" ON storage.objects
FOR DELETE USING (bucket_id = 'featured-bestie-audio' AND has_admin_access(auth.uid()));