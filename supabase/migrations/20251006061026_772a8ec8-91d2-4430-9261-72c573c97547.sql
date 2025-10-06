-- Drop ALL existing RLS policies on sponsorship_receipts
DROP POLICY IF EXISTS "Users can view their own receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Users can view their own receipts by email" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Admins can view all receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Admins can manage receipts" ON sponsorship_receipts;

-- Enable RLS on the table
ALTER TABLE sponsorship_receipts ENABLE ROW LEVEL SECURITY;

-- Create simple policy for users to view their own receipts
CREATE POLICY "Users view own receipts"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins using the has_admin_access function
CREATE POLICY "Admins view all receipts"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Allow system to insert receipts
CREATE POLICY "System can insert receipts"
ON sponsorship_receipts
FOR INSERT
TO authenticated
WITH CHECK (true);