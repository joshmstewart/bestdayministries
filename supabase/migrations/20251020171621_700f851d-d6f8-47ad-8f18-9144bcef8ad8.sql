-- Allow authenticated users to view sponsorships for public funding progress display
-- This extends the anonymous policy to authenticated users so supporters/besties can see funding totals
CREATE POLICY "Authenticated users can view sponsorships for funding display"
ON public.sponsorships
FOR SELECT
TO authenticated
USING (
  -- Only allow viewing sponsorships where the bestie has an active approved featured bestie
  EXISTS (
    SELECT 1 
    FROM public.featured_besties fb
    WHERE fb.bestie_id = sponsorships.bestie_id
      AND fb.is_active = true
      AND fb.approval_status = 'approved'
  )
);