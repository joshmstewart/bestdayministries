-- Add DELETE policy for admin users to reset wheel spins
CREATE POLICY "Admins can delete wheel spins"
ON public.chore_wheel_spins
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'owner')
  )
);