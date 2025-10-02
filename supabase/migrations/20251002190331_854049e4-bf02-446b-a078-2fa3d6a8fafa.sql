-- Update sponsorships RLS policy to prevent besties from sponsoring
DROP POLICY IF EXISTS "Users can create sponsorships" ON public.sponsorships;

CREATE POLICY "Users can create sponsorships"
ON public.sponsorships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sponsor_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role != 'bestie'
  )
);