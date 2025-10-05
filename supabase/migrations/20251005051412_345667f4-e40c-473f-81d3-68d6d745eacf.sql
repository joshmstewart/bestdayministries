-- Allow sponsors to mark messages as read
CREATE POLICY "Sponsors can mark their messages as read"
ON public.sponsor_messages
FOR UPDATE
USING (
  status IN ('approved', 'sent')
  AND EXISTS (
    SELECT 1 
    FROM public.sponsorships 
    WHERE sponsorships.bestie_id = sponsor_messages.bestie_id
      AND sponsorships.sponsor_id = auth.uid()
      AND sponsorships.status = 'active'
  )
)
WITH CHECK (
  -- Only allow updating is_read field
  status IN ('approved', 'sent')
  AND EXISTS (
    SELECT 1 
    FROM public.sponsorships 
    WHERE sponsorships.bestie_id = sponsor_messages.bestie_id
      AND sponsorships.sponsor_id = auth.uid()
      AND sponsorships.status = 'active'
  )
);