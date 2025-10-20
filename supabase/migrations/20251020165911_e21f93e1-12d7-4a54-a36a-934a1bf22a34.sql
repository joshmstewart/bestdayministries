-- Allow anonymous users to view sponsorships for public funding progress display
-- This only exposes aggregated funding amounts, not personal sponsor information
CREATE POLICY "Anonymous users can view sponsorships for funding display"
ON public.sponsorships
FOR SELECT
TO anon
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