-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated users can upload workout images" ON storage.objects;

-- Create a new policy that allows both authenticated users and service role
CREATE POLICY "Users and service can upload workout images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'workout-images' 
  AND (
    auth.role() = 'authenticated' 
    OR auth.role() = 'service_role'
  )
);