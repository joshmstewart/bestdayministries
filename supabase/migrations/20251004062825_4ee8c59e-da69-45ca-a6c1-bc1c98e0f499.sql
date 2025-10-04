-- Add RLS policy for vendors to view linked besties profiles
CREATE POLICY "Vendors can view linked besties profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM vendor_bestie_requests vbr
    JOIN vendors v ON v.id = vbr.vendor_id
    WHERE vbr.bestie_id = profiles.id
      AND v.user_id = auth.uid()
      AND vbr.status = 'approved'
  )
);