-- Create storage buckets for events
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('event-images', 'event-images', true),
  ('event-audio', 'event-audio', true);

-- RLS policies for event-images bucket
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- RLS policies for event-audio bucket
CREATE POLICY "Event audio files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-audio');

CREATE POLICY "Authenticated users can upload event audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-audio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own event audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-audio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own event audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-audio' 
  AND auth.role() = 'authenticated'
);