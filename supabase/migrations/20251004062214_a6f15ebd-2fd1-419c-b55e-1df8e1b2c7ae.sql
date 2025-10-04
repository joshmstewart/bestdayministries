-- Add DELETE policy for guardians to remove vendor-bestie links
CREATE POLICY "Guardians can delete vendor links for their besties"
ON vendor_bestie_requests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM caregiver_bestie_links 
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = vendor_bestie_requests.bestie_id
  )
);