-- Fix Issue #2: Add admin policy for sponsorships table
CREATE POLICY "Admins can view all sponsorships"
ON public.sponsorships
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Add admin policy for updates (if not exists)
CREATE POLICY "Admins can update all sponsorships"
ON public.sponsorships
FOR UPDATE
USING (has_admin_access(auth.uid()));

-- Ensure sponsorship_receipts always has user_id populated
-- Add policy for guests to see receipts by email match
CREATE POLICY "Users can view receipts by email match"
ON public.sponsorship_receipts
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR 
  (user_id IS NULL AND sponsor_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);