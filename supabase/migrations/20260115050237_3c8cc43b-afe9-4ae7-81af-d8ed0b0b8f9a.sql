-- Create storage bucket for prayer images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('prayer-images', 'prayer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prayer-images bucket
CREATE POLICY "Anyone can view prayer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'prayer-images');

CREATE POLICY "Authenticated users can upload prayer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prayer-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own prayer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'prayer-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own prayer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'prayer-images' AND auth.uid()::text = (storage.foldername(name))[1]);