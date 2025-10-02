-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can upload featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete featured bestie images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update featured bestie audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete featured bestie audio" ON storage.objects;

-- Create new policies that allow both admins and owners
CREATE POLICY "Admins and owners can upload featured bestie images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'featured-bestie-images' 
  AND is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins and owners can update featured bestie images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'featured-bestie-images' 
  AND is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins and owners can delete featured bestie images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'featured-bestie-images' 
  AND is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins and owners can upload featured bestie audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'featured-bestie-audio' 
  AND is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins and owners can update featured bestie audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'featured-bestie-audio' 
  AND is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins and owners can delete featured bestie audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'featured-bestie-audio' 
  AND is_admin_or_owner(auth.uid())
);