-- Create storage bucket for avatar celebration images
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar-celebration-images', 'avatar-celebration-images', true);

-- Allow anyone to view celebration images (they're public)
CREATE POLICY "Anyone can view celebration images"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatar-celebration-images');

-- Allow admins to upload/update celebration images
CREATE POLICY "Admins can upload celebration images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatar-celebration-images' 
  AND public.is_admin_or_owner()
);

-- Allow admins to update celebration images
CREATE POLICY "Admins can update celebration images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatar-celebration-images' 
  AND public.is_admin_or_owner()
);

-- Allow admins to delete celebration images
CREATE POLICY "Admins can delete celebration images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatar-celebration-images' 
  AND public.is_admin_or_owner()
);