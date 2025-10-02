-- Add approval system columns to featured_besties table
ALTER TABLE public.featured_besties
ADD COLUMN approval_status text NOT NULL DEFAULT 'approved',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add check constraint for approval_status
ALTER TABLE public.featured_besties
ADD CONSTRAINT featured_besties_approval_status_check 
CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_featured_besties_updated_at
BEFORE UPDATE ON public.featured_besties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop existing guardian policies and recreate with approval logic
DROP POLICY IF EXISTS "Guardians can create featured besties for linked besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Guardians can update featured besties for linked besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Guardians can delete featured besties for linked besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Featured besties viewable by everyone" ON public.featured_besties;

-- Guardians can create, but posts default to pending_approval
CREATE POLICY "Guardians can create featured besties pending approval"
ON public.featured_besties
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status = 'pending_approval'
);

-- Guardians can update their pending/rejected posts (sets back to pending)
CREATE POLICY "Guardians can update their pending featured besties"
ON public.featured_besties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status IN ('pending_approval', 'rejected')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status = 'pending_approval'
);

-- Guardians can delete their pending/rejected posts
CREATE POLICY "Guardians can delete their pending featured besties"
ON public.featured_besties
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
  AND approval_status IN ('pending_approval', 'rejected')
);

-- Public can only see approved posts
CREATE POLICY "Only approved featured besties viewable by public"
ON public.featured_besties
FOR SELECT
TO authenticated
USING (
  approval_status = 'approved'
  OR has_admin_access(auth.uid())
  OR (
    EXISTS (
      SELECT 1
      FROM caregiver_bestie_links
      WHERE caregiver_id = auth.uid()
        AND bestie_id = featured_besties.bestie_id
    )
  )
);

-- Update existing admin-created posts to approved status
UPDATE public.featured_besties
SET approval_status = 'approved'
WHERE approval_status = 'pending_approval'
  AND bestie_id IS NULL;