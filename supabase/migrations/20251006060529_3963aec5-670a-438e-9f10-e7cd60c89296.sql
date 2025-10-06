-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own receipts by email" ON sponsorship_receipts;

-- Create a security definer function to get user email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Create the correct policy using the security definer function
CREATE POLICY "Users can view their own receipts by email"
ON sponsorship_receipts
FOR SELECT
USING (sponsor_email = get_user_email(auth.uid()));