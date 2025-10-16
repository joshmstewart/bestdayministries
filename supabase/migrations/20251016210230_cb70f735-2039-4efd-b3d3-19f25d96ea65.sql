-- Create RLS policies for newsletter video uploads
DO $$ 
BEGIN
  -- Allow authenticated users to upload videos to newsletter-videos folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload newsletter videos'
  ) THEN
    CREATE POLICY "Authenticated users can upload newsletter videos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'videos' AND
      (storage.foldername(name))[1] = 'newsletter-videos'
    );
  END IF;

  -- Allow public read access to newsletter videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to newsletter videos'
  ) THEN
    CREATE POLICY "Public read access to newsletter videos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'videos' AND
      (storage.foldername(name))[1] = 'newsletter-videos'
    );
  END IF;
END $$;