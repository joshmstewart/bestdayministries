-- Allow authenticated users to upload to app-assets bucket
CREATE POLICY "Authenticated users can upload to app-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-assets');