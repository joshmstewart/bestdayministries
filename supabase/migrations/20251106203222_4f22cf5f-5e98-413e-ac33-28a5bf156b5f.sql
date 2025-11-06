-- Add admin SELECT policy for customer support
-- This allows admins to help customers retrieve receipts while maintaining privacy through:
-- 1. UI filtering by specific transaction (defense in depth)
-- 2. Audit trails for all admin queries
-- 3. Role-based access control (only admin/owner roles)

CREATE POLICY "Admins can view receipts for customer support"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));