-- Storage policies for vendor profile images
-- Allow approved vendors to upload images to vendors folder
CREATE POLICY "Approved vendors can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'vendors'
  AND (
    EXISTS (
      SELECT 1 FROM vendors 
      WHERE vendors.user_id = auth.uid() 
      AND vendors.status = 'approved'
    )
  )
);

-- Allow anyone to view vendor profile images (public read)
CREATE POLICY "Anyone can view vendor profile images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'vendors'
);

-- Allow vendors to delete their own profile images
CREATE POLICY "Vendors can delete their profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'vendors'
  AND (
    EXISTS (
      SELECT 1 FROM vendors 
      WHERE vendors.user_id = auth.uid()
    )
  )
);