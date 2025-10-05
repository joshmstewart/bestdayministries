-- Allow sponsors to view approved/sent messages from besties they're sponsoring
CREATE POLICY "Sponsors can view approved messages from their besties"
ON public.sponsor_messages
FOR SELECT
USING (
  status IN ('approved', 'sent')
  AND EXISTS (
    SELECT 1 
    FROM public.sponsorships 
    WHERE sponsorships.bestie_id = sponsor_messages.bestie_id
      AND sponsorships.sponsor_id = auth.uid()
      AND sponsorships.status = 'active'
  )
);