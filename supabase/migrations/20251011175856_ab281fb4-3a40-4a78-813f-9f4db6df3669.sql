-- Add UPDATE policy for terms_acceptance to allow upserts
CREATE POLICY "Users can update their own acceptance"
ON terms_acceptance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);