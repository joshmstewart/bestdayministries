-- Add columns to prayer_requests for audio, role visibility, and bestie approval flow
ALTER TABLE public.prayer_requests
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS visible_to_roles public.user_role[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add column to caregiver_bestie_links for prayer approval requirement
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN IF NOT EXISTS require_prayer_approval BOOLEAN DEFAULT true;

-- Create index for approval status lookups
CREATE INDEX IF NOT EXISTS idx_prayer_requests_approval_status ON public.prayer_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_visible_to_roles ON public.prayer_requests USING GIN(visible_to_roles);

-- Update RLS policies to handle role visibility and bestie creation
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users can view their own prayers" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users can view approved public prayers" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users can update their own prayers" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users can delete their own prayers" ON public.prayer_requests;
DROP POLICY IF EXISTS "Guardians can approve bestie prayers" ON public.prayer_requests;
DROP POLICY IF EXISTS "Guardians can view bestie prayers for approval" ON public.prayer_requests;

-- Allow authenticated users to create prayer requests (including besties)
CREATE POLICY "Users can create their own prayer requests"
ON public.prayer_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own prayers (any status)
CREATE POLICY "Users can view their own prayers"
ON public.prayer_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view approved public prayers if:
-- 1. Prayer is approved AND public AND not expired
-- 2. Either no role restriction OR user's role is in visible_to_roles
CREATE POLICY "Users can view approved public prayers"
ON public.prayer_requests
FOR SELECT
TO authenticated
USING (
  is_public = true 
  AND approval_status = 'approved'
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    visible_to_roles IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = ANY(visible_to_roles)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  )
);

-- Users can update their own prayers
CREATE POLICY "Users can update their own prayers"
ON public.prayer_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prayers
CREATE POLICY "Users can delete their own prayers"
ON public.prayer_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Guardians can view and update prayers from their linked besties (for approval)
CREATE POLICY "Guardians can view bestie prayers for approval"
ON public.prayer_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links cbl
    WHERE cbl.caregiver_id = auth.uid()
    AND cbl.bestie_id = prayer_requests.user_id
  )
);

-- Guardians can approve/reject bestie prayers
CREATE POLICY "Guardians can approve bestie prayers"
ON public.prayer_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links cbl
    WHERE cbl.caregiver_id = auth.uid()
    AND cbl.bestie_id = prayer_requests.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links cbl
    WHERE cbl.caregiver_id = auth.uid()
    AND cbl.bestie_id = prayer_requests.user_id
  )
);