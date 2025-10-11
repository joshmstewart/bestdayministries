-- Allow authenticated users to search for profiles by friend code
-- This enables guardians to find besties before creating a link
CREATE POLICY "Authenticated users can search by friend code"
ON public.profiles
FOR SELECT
TO authenticated
USING (friend_code IS NOT NULL);