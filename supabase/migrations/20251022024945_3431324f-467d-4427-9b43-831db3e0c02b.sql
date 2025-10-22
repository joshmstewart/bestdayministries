-- Add RLS policy to allow guardians to insert messages on behalf of their linked besties
CREATE POLICY "Guardians can create messages for linked besties"
ON sponsor_messages
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_bestie_links.caregiver_id = auth.uid()
      AND caregiver_bestie_links.bestie_id = sponsor_messages.bestie_id
      AND caregiver_bestie_links.allow_sponsor_messages = true
  )
);