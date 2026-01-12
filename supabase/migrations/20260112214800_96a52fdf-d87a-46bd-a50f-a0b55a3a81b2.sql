-- Drop the existing policy
DROP POLICY IF EXISTS "Guardians can manage chores for linked besties" ON public.chores;

-- Create a new policy that allows:
-- 1. Guardians/admins to manage chores for their linked besties
-- 2. Besties to manage their OWN chores (where they are the creator)
CREATE POLICY "Users can manage chores"
ON public.chores
FOR ALL
TO authenticated
USING (
  -- Can SELECT if: guardian of bestie, OR is the bestie, OR is admin
  is_guardian_of(auth.uid(), bestie_id) 
  OR bestie_id = auth.uid() 
  OR has_admin_access(auth.uid())
)
WITH CHECK (
  -- Can INSERT/UPDATE/DELETE if:
  -- 1. Guardian of the bestie OR admin (can manage any chore for that bestie)
  -- 2. OR the bestie themselves AND they created the chore (can only manage their own)
  is_guardian_of(auth.uid(), bestie_id) 
  OR has_admin_access(auth.uid())
  OR (bestie_id = auth.uid() AND created_by = auth.uid())
);