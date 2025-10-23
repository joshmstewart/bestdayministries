-- Add INSERT policy for contact form submissions
-- Allow authenticated users to insert their own submissions
CREATE POLICY "Users can insert their own submissions"
ON contact_form_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);