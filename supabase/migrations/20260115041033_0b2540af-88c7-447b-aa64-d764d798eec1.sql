-- Create storage bucket for Joy House Stores images
INSERT INTO storage.buckets (id, name, public)
VALUES ('joy-house-stores', 'joy-house-stores', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for joy-house-stores"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'joy-house-stores');

-- Allow admin upload
CREATE POLICY "Admin upload for joy-house-stores"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'joy-house-stores' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Allow admin delete
CREATE POLICY "Admin delete for joy-house-stores"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'joy-house-stores' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);