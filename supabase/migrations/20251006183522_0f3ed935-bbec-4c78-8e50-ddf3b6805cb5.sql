-- Drop the broken RLS policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.sponsorship_receipts;
DROP POLICY IF EXISTS "Admins can view all receipts" ON public.sponsorship_receipts;
DROP POLICY IF EXISTS "Service role can insert receipts" ON public.sponsorship_receipts;

-- Create a security definer function to get user's email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id;
$$;

-- Recreate RLS policies with correct email filtering
CREATE POLICY "Users can view their own receipts"
  ON public.sponsorship_receipts
  FOR SELECT
  USING (sponsor_email = get_user_email(auth.uid()));

-- Admins can view all receipts
CREATE POLICY "Admins can view all receipts"
  ON public.sponsorship_receipts
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Allow authenticated service role to insert receipts (webhook usage)
CREATE POLICY "Service role can insert receipts"
  ON public.sponsorship_receipts
  FOR INSERT
  TO service_role
  WITH CHECK (true);