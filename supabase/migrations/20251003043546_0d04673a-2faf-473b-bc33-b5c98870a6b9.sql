-- Create sponsor_besties table (completely separate from featured_besties)
CREATE TABLE IF NOT EXISTS public.sponsor_besties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bestie_id UUID REFERENCES auth.users(id),
  bestie_name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  voice_note_url TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT 'portrait',
  monthly_goal NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_fully_funded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'approved',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sponsor_besties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sponsor_besties
CREATE POLICY "Admins can manage sponsor besties"
ON public.sponsor_besties
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Sponsor besties viewable by everyone"
ON public.sponsor_besties
FOR SELECT
USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Guardians can create sponsor besties pending approval"
ON public.sponsor_besties
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status = 'pending_approval'
);

CREATE POLICY "Guardians can update their pending sponsor besties"
ON public.sponsor_besties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status IN ('pending_approval', 'rejected')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status = 'pending_approval'
);

CREATE POLICY "Guardians can delete their pending sponsor besties"
ON public.sponsor_besties
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status IN ('pending_approval', 'rejected')
);

-- Trigger for updated_at
CREATE TRIGGER update_sponsor_besties_updated_at
BEFORE UPDATE ON public.sponsor_besties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for sponsor bestie funding progress
CREATE OR REPLACE VIEW public.sponsor_bestie_funding_progress AS
SELECT 
  sb.id as sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  sb.monthly_goal,
  COALESCE(SUM(CASE WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount ELSE 0 END), 0) as current_monthly_pledges,
  sb.monthly_goal - COALESCE(SUM(CASE WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount ELSE 0 END), 0) as remaining_needed,
  CASE 
    WHEN sb.monthly_goal > 0 THEN 
      (COALESCE(SUM(CASE WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount ELSE 0 END), 0) / sb.monthly_goal * 100)
    ELSE 0 
  END as funding_percentage
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON s.bestie_id = sb.bestie_id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal;