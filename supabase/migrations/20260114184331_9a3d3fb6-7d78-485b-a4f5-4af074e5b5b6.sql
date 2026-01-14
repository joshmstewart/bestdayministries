-- Allow admins/owners to delete any joke
CREATE POLICY "Admins can delete any jokes" 
ON public.saved_jokes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'owner')
  )
);