-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view receipts by email match" ON public.sponsorship_receipts;

-- Create a simple, working policy
CREATE POLICY "Users can view their own receipts"
ON public.sponsorship_receipts
FOR SELECT
USING (user_id = auth.uid());