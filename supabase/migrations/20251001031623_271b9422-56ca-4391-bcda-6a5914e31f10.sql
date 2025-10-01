-- Update RLS policies to allow both admin and owner roles to manage featured besties

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins can update featured besties" ON public.featured_besties;
DROP POLICY IF EXISTS "Admins can delete featured besties" ON public.featured_besties;

-- Create new policies that include owner role
CREATE POLICY "Admins and owners can insert featured besties"
ON public.featured_besties
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can update featured besties"
ON public.featured_besties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can delete featured besties"
ON public.featured_besties
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);