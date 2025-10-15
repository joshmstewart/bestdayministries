-- Add DELETE policy for contact form submissions
CREATE POLICY "Admins can delete submissions"
ON contact_form_submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Add better logging: check if submissions are being filtered incorrectly
-- No schema change needed, just adding the DELETE policy