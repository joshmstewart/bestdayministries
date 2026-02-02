-- Create vendor onboarding progress table
CREATE TABLE public.vendor_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  completed_steps TEXT[] DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- Enable Row Level Security
ALTER TABLE public.vendor_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their vendor's onboarding progress
CREATE POLICY "Users can manage their vendor onboarding progress"
ON public.vendor_onboarding_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendors v 
    WHERE v.id = vendor_onboarding_progress.vendor_id 
    AND v.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.vendor_team_members tm
    WHERE tm.vendor_id = vendor_onboarding_progress.vendor_id
    AND tm.user_id = auth.uid()
    AND tm.accepted_at IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendors v 
    WHERE v.id = vendor_onboarding_progress.vendor_id 
    AND v.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.vendor_team_members tm
    WHERE tm.vendor_id = vendor_onboarding_progress.vendor_id
    AND tm.user_id = auth.uid()
    AND tm.accepted_at IS NOT NULL
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_vendor_onboarding_progress_updated_at
  BEFORE UPDATE ON public.vendor_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();