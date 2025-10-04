-- Add storage policies for vendor product image uploads

-- Allow vendors to upload product images to app-assets bucket
CREATE POLICY "Vendors can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'products'
  AND EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.user_id = auth.uid()
    AND vendors.status = 'approved'
  )
);

-- Allow vendors to view their own product images
CREATE POLICY "Vendors can view product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'products'
);

-- Allow vendors to delete their own product images
CREATE POLICY "Vendors can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-assets' 
  AND (storage.foldername(name))[1] = 'products'
  AND EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.user_id = auth.uid()
    AND vendors.status = 'approved'
  )
);