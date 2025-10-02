-- Allow sponsors to view profiles of besties they sponsor
CREATE POLICY "Sponsors can view sponsored besties profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sponsorships
    WHERE sponsorships.bestie_id = profiles.id
      AND sponsorships.sponsor_id = auth.uid()
      AND sponsorships.status = 'active'
  )
);