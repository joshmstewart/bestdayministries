-- Allow admins/owners to update any event
CREATE POLICY "Admins can update any event"
ON public.events
FOR UPDATE
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));