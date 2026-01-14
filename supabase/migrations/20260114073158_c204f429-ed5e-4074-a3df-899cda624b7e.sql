-- Create storage bucket for beat pad AI audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('beat-pad-audio', 'beat-pad-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own beat audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-pad-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Beat audio is publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'beat-pad-audio');

-- Allow users to delete their own audio
CREATE POLICY "Users can delete their own beat audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-pad-audio' AND (storage.foldername(name))[1] = auth.uid()::text);