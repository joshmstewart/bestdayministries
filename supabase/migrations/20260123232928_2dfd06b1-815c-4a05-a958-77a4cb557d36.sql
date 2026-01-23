-- Allow anonymous users to upload to contact-form folder
CREATE POLICY "Anyone can upload contact form images" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'app-assets' AND (storage.foldername(name))[1] = 'contact-form');