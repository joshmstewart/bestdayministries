-- Create sponsor_bestie_requests table for managing sponsor-bestie connections
CREATE TABLE IF NOT EXISTS public.sponsor_bestie_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_bestie_id UUID REFERENCES public.sponsor_besties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, bestie_id)
);

-- Enable RLS
ALTER TABLE public.sponsor_bestie_requests ENABLE ROW LEVEL SECURITY;

-- Sponsors can see their own requests
CREATE POLICY "Sponsors can view their requests"
ON public.sponsor_bestie_requests
FOR SELECT
USING (auth.uid() = sponsor_id);

-- Besties can see requests to them
CREATE POLICY "Besties can view requests to them"
ON public.sponsor_bestie_requests
FOR SELECT
USING (auth.uid() = bestie_id);

-- Guardians can see requests to their linked besties
CREATE POLICY "Guardians can view requests to linked besties"
ON public.sponsor_bestie_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() AND bestie_id = sponsor_bestie_requests.bestie_id
  )
);

-- Sponsors can create requests
CREATE POLICY "Supporters can create sponsor requests"
ON public.sponsor_bestie_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sponsor_id AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supporter'
  )
);

-- Guardians can approve/reject requests
CREATE POLICY "Guardians can update requests for linked besties"
ON public.sponsor_bestie_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() AND bestie_id = sponsor_bestie_requests.bestie_id
  )
);

-- Sponsors can cancel their pending requests
CREATE POLICY "Sponsors can delete their pending requests"
ON public.sponsor_bestie_requests
FOR DELETE
USING (auth.uid() = sponsor_id AND status = 'pending');

-- Add trigger for updated_at
CREATE TRIGGER update_sponsor_bestie_requests_updated_at
BEFORE UPDATE ON public.sponsor_bestie_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add show_sponsor_link fields to caregiver_bestie_links to control visibility
ALTER TABLE public.caregiver_bestie_links 
ADD COLUMN IF NOT EXISTS show_sponsor_link_on_bestie BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_sponsor_link_on_guardian BOOLEAN NOT NULL DEFAULT true;