-- Update RLS policy for sponsor_besties to include is_public check
DROP POLICY IF EXISTS "Sponsor besties viewable by everyone" ON public.sponsor_besties;

CREATE POLICY "Public sponsor besties viewable by everyone"
ON public.sponsor_besties
FOR SELECT
TO public
USING (
  is_active = true 
  AND is_public = true 
  AND approval_status = 'approved'
);