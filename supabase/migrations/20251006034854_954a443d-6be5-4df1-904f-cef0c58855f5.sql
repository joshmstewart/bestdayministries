-- Fix the sponsorships RLS policy that's causing permission denied errors
-- Remove the policy that tries to query auth.users directly
DROP POLICY IF EXISTS "Sponsors view their own" ON public.sponsorships;

-- Create a new policy that doesn't query auth.users directly
CREATE POLICY "Sponsors view their own sponsorships"
ON public.sponsorships
FOR SELECT
TO public
USING (
  auth.uid() = sponsor_id 
  OR 
  (sponsor_email IS NOT NULL AND sponsor_email = auth.email()::text)
);