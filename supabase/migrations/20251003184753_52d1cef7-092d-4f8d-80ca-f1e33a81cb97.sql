-- Add UPDATE policy for caregivers to modify their own links
CREATE POLICY "Caregivers can update their links"
ON public.caregiver_bestie_links
FOR UPDATE
TO authenticated
USING (auth.uid() = caregiver_id)
WITH CHECK (auth.uid() = caregiver_id);