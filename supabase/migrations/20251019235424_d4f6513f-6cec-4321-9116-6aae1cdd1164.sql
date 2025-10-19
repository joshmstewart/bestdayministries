-- Add admin access policy for sponsorship receipts
CREATE POLICY "Admins can view all receipts"
ON sponsorship_receipts
FOR SELECT
TO public
USING (has_admin_access(auth.uid()));