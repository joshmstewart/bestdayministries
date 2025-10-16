-- Ensure app-assets bucket exists for newsletter images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'app-assets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('app-assets', 'app-assets', true);
  END IF;
END $$;

-- Create policy for authenticated users to upload newsletter images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload newsletter images'
  ) THEN
    CREATE POLICY "Authenticated users can upload newsletter images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'app-assets' 
      AND (storage.foldername(name))[1] = 'newsletter-images'
    );
  END IF;
END $$;

-- Create policy for public read access to newsletter images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view newsletter images'
  ) THEN
    CREATE POLICY "Public can view newsletter images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'app-assets' 
      AND (storage.foldername(name))[1] = 'newsletter-images'
    );
  END IF;
END $$;