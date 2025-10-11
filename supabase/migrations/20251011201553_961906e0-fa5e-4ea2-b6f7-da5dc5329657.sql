-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create submissions" ON public.contact_form_submissions;

-- Create new policy that explicitly allows both authenticated and anonymous users
CREATE POLICY "Anyone can create submissions including anonymous"
ON public.contact_form_submissions
FOR INSERT
TO public
WITH CHECK (true);