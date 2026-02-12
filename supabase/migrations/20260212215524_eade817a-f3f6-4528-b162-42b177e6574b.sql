-- Allow any authenticated user to check if someone has the bestie role
-- This is needed for the guardian-bestie linking flow
CREATE POLICY "Authenticated users can check bestie role"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND role = 'bestie'
);