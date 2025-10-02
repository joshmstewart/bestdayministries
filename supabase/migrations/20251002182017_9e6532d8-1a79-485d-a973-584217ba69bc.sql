-- Add column to track if a bestie can be featured (per guardian-bestie link)
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN allow_featured_posts boolean NOT NULL DEFAULT true;

-- Update RLS policies on featured_besties to allow guardians to manage posts for their linked besties

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins can update featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins can delete featured besties" ON public.featured_besties;

-- Admins can do everything
CREATE POLICY "Admins can manage featured besties"
ON public.featured_besties
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Guardians can insert featured besties for their linked besties (if allowed)
CREATE POLICY "Guardians can create featured besties for linked besties"
ON public.featured_besties
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
);

-- Guardians can update featured besties for their linked besties
CREATE POLICY "Guardians can update featured besties for linked besties"
ON public.featured_besties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
);

-- Guardians can delete featured besties for their linked besties
CREATE POLICY "Guardians can delete featured besties for linked besties"
ON public.featured_besties
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = featured_besties.bestie_id
      AND allow_featured_posts = true
  )
);