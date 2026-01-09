-- Create newsletter-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletter-images', 'newsletter-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Newsletter images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'newsletter-images');

-- Create storage policy for admin uploads
CREATE POLICY "Admins can upload newsletter images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'newsletter-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);