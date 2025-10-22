-- CRITICAL FIX: Remove the policy that lets admins see ALL receipts
-- Admins should only see their OWN receipts when viewing their donation history
-- We'll add a separate admin management interface if needed

DROP POLICY IF EXISTS "Admins can view all receipts" ON sponsorship_receipts;

-- Keep the user policy that restricts to own receipts only
-- This policy ensures users can ONLY see receipts where:
-- 1. The user_id matches their auth.uid(), OR
-- 2. The sponsor_email matches their email (for guest checkouts that were later linked)

-- No changes needed to existing "Users can view their own receipts" policy
-- It already properly restricts access

-- Add explicit admin management policy ONLY for updates (not viewing all)
CREATE POLICY "Admins can update receipt settings"
ON sponsorship_receipts
FOR UPDATE
TO authenticated
USING (has_admin_access(auth.uid()));

COMMENT ON POLICY "Admins can update receipt settings" ON sponsorship_receipts IS 
'Admins can update receipt records for administrative purposes, but cannot view all receipts';