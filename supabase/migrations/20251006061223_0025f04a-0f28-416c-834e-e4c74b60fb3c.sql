-- Drop ALL old policies completely
DROP POLICY IF EXISTS "Sponsors can view their own receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Service can insert receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Users view own receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "Admins view all receipts" ON sponsorship_receipts;
DROP POLICY IF EXISTS "System can insert receipts" ON sponsorship_receipts;

-- Now create clean, simple policies
CREATE POLICY "users_select_own_receipts"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_select_all_receipts"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

CREATE POLICY "authenticated_insert_receipts"
ON sponsorship_receipts
FOR INSERT
TO authenticated
WITH CHECK (true);