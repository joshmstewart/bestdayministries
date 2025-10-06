-- Remove the path-based admin policy (it won't work)
DROP POLICY IF EXISTS "Admins can view all receipts in admin context" ON public.sponsorship_receipts;

-- Keep only the user-specific policy
-- This ensures even admins only see their OWN receipts in personal donation history
-- Admins can view all receipts via admin panel using service role queries

-- Policy already exists: "Users can view their own receipts"
-- It allows viewing by user_id OR sponsor_email match