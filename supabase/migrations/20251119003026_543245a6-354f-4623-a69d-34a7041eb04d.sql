-- Add DELETE policy for donations table to allow admins to delete
CREATE POLICY "Admins can delete donations"
ON public.donations
FOR DELETE
TO public
USING (has_admin_access(auth.uid()));