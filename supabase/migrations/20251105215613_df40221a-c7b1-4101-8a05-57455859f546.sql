-- Add donation_id column to receipt_generation_logs
ALTER TABLE receipt_generation_logs 
ADD COLUMN IF NOT EXISTS donation_id uuid REFERENCES donations(id) ON DELETE CASCADE;

-- Add constraint: must have either sponsorship_id OR donation_id
ALTER TABLE receipt_generation_logs
DROP CONSTRAINT IF EXISTS receipt_logs_requires_transaction;

ALTER TABLE receipt_generation_logs
ADD CONSTRAINT receipt_logs_requires_transaction 
CHECK (
  (sponsorship_id IS NOT NULL AND donation_id IS NULL) OR
  (donation_id IS NOT NULL AND sponsorship_id IS NULL)
);

-- Add index for donations
CREATE INDEX IF NOT EXISTS idx_receipt_logs_donation ON receipt_generation_logs(donation_id);

-- Add RLS policy for donations
DROP POLICY IF EXISTS "Users can view their donation receipt logs" ON receipt_generation_logs;

CREATE POLICY "Users can view their donation receipt logs"
ON receipt_generation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM donations d
    WHERE d.id = receipt_generation_logs.donation_id
    AND (d.donor_id = auth.uid() OR d.donor_email = get_user_email(auth.uid()))
  )
);