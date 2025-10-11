-- Fix: Replace app_settings_public view with secure function
-- Drop the existing view
DROP VIEW IF EXISTS app_settings_public;

-- Create a security definer function that returns only public settings
CREATE OR REPLACE FUNCTION public.get_public_app_settings()
RETURNS TABLE (
  id uuid,
  setting_key text,
  setting_value jsonb,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    setting_key,
    setting_value,
    updated_at
  FROM app_settings
  WHERE setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url', 'sponsor_page_content');
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION public.get_public_app_settings() TO anon, authenticated;

-- Fix: Make sensitive storage buckets private with proper access control
-- Update featured-bestie-audio and featured-bestie-images to be private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('featured-bestie-audio', 'featured-bestie-images');

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view featured bestie audio" ON storage.objects;

-- Add RLS policies for authenticated users to access approved content
CREATE POLICY "Authenticated users can view featured bestie images"
ON storage.objects 
FOR SELECT
TO authenticated
USING (
  bucket_id = 'featured-bestie-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM featured_besties 
    WHERE approval_status = 'approved' 
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can view featured bestie audio"
ON storage.objects 
FOR SELECT
TO authenticated
USING (
  bucket_id = 'featured-bestie-audio'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM featured_besties 
    WHERE approval_status = 'approved' 
    AND is_active = true
  )
);

-- Admins can upload to these buckets
CREATE POLICY "Admins can upload featured bestie images"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'featured-bestie-images'
  AND has_admin_access(auth.uid())
);

CREATE POLICY "Admins can upload featured bestie audio"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'featured-bestie-audio'
  AND has_admin_access(auth.uid())
);

-- Admins can update and delete
CREATE POLICY "Admins can update featured bestie images"
ON storage.objects 
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'featured-bestie-images'
  AND has_admin_access(auth.uid())
);

CREATE POLICY "Admins can delete featured bestie images"
ON storage.objects 
FOR DELETE
TO authenticated
USING (
  bucket_id = 'featured-bestie-images'
  AND has_admin_access(auth.uid())
);

CREATE POLICY "Admins can update featured bestie audio"
ON storage.objects 
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'featured-bestie-audio'
  AND has_admin_access(auth.uid())
);

CREATE POLICY "Admins can delete featured bestie audio"
ON storage.objects 
FOR DELETE
TO authenticated
USING (
  bucket_id = 'featured-bestie-audio'
  AND has_admin_access(auth.uid())
);