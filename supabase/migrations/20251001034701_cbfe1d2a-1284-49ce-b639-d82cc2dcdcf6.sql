-- Create storage bucket for discussion images
INSERT INTO storage.buckets (id, name, public)
VALUES ('discussion-images', 'discussion-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for discussion images
CREATE POLICY "Anyone can view discussion images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'discussion-images');

CREATE POLICY "Authenticated users can upload discussion images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'discussion-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own discussion images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'discussion-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own discussion images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'discussion-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins and owners to delete any discussion images
CREATE POLICY "Admins can delete any discussion images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'discussion-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);