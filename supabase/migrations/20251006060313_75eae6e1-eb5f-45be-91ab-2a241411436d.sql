-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own receipts by email" ON sponsorship_receipts;

-- Create a new policy using auth.email() function instead
CREATE POLICY "Users can view their own receipts by email"
ON sponsorship_receipts
FOR SELECT
USING (sponsor_email = auth.email());