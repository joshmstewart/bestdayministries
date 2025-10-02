-- Create table to track sponsorship visibility for besties
CREATE TABLE public.sponsorship_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID NOT NULL REFERENCES public.sponsorships(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sponsorship_id, bestie_id)
);

-- Enable RLS
ALTER TABLE public.sponsorship_shares ENABLE ROW LEVEL SECURITY;

-- Guardians can manage shares for their own sponsorships
CREATE POLICY "Guardians can create shares for their sponsorships"
ON public.sponsorship_shares
FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM public.sponsorships
    WHERE id = sponsorship_id AND sponsor_id = auth.uid()
  )
);

CREATE POLICY "Guardians can delete their shares"
ON public.sponsorship_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sponsorships
    WHERE id = sponsorship_id AND sponsor_id = auth.uid()
  )
);

-- Guardians and shared besties can view shares
CREATE POLICY "Users can view shares they're involved in"
ON public.sponsorship_shares
FOR SELECT
USING (
  auth.uid() = bestie_id OR
  EXISTS (
    SELECT 1 FROM public.sponsorships
    WHERE id = sponsorship_id AND sponsor_id = auth.uid()
  )
);

-- Update sponsorships policy to allow shared besties to view
CREATE POLICY "Shared besties can view sponsorships"
ON public.sponsorships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sponsorship_shares
    WHERE sponsorship_id = sponsorships.id AND bestie_id = auth.uid()
  )
);