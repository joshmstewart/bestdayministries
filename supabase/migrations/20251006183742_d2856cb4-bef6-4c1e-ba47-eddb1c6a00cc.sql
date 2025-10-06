-- Drop old/incorrect policies
DROP POLICY IF EXISTS "users_select_own_receipts" ON public.sponsorship_receipts;
DROP POLICY IF EXISTS "admins_select_all_receipts" ON public.sponsorship_receipts;
DROP POLICY IF EXISTS "authenticated_insert_receipts" ON public.sponsorship_receipts;

-- The correct policies should remain:
-- "Users can view their own receipts" - uses sponsor_email = get_user_email(auth.uid())
-- "Admins can view all receipts" - uses has_admin_access(auth.uid())
-- "Service role can insert receipts" - for service_role only