-- Add DELETE policy for sponsorships table to allow admins to delete records
CREATE POLICY "Admins can delete sponsorships"
ON public.sponsorships
FOR DELETE
TO authenticated
USING (has_admin_access(auth.uid()));