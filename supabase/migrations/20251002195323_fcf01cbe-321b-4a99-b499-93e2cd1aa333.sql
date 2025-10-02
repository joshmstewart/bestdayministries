-- Drop the problematic policy
DROP POLICY IF EXISTS "Shared besties can view sponsorships" ON public.sponsorships;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Shared besties can view sponsorships"
ON public.sponsorships
FOR SELECT
USING (
  -- User is the sponsor OR the bestie OR has been granted shared access
  auth.uid() = sponsor_id OR 
  auth.uid() = bestie_id OR
  id IN (
    SELECT sponsorship_id 
    FROM public.sponsorship_shares 
    WHERE bestie_id = auth.uid()
  )
);