-- Drop existing policies on caregiver_bestie_links
DROP POLICY IF EXISTS "Caregivers can create links" ON caregiver_bestie_links;
DROP POLICY IF EXISTS "Caregivers can update their links" ON caregiver_bestie_links;
DROP POLICY IF EXISTS "Caregivers can delete their links" ON caregiver_bestie_links;
DROP POLICY IF EXISTS "Links viewable by caregiver or bestie" ON caregiver_bestie_links;

-- Create new policies that allow admins to manage links
CREATE POLICY "Caregivers and admins can create links"
ON caregiver_bestie_links
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caregiver_id 
  OR has_admin_access(auth.uid())
);

CREATE POLICY "Caregivers and admins can update links"
ON caregiver_bestie_links
FOR UPDATE
TO authenticated
USING (
  auth.uid() = caregiver_id 
  OR has_admin_access(auth.uid())
)
WITH CHECK (
  auth.uid() = caregiver_id 
  OR has_admin_access(auth.uid())
);

CREATE POLICY "Caregivers and admins can delete links"
ON caregiver_bestie_links
FOR DELETE
TO authenticated
USING (
  auth.uid() = caregiver_id 
  OR has_admin_access(auth.uid())
);

CREATE POLICY "Links viewable by caregiver, bestie, or admins"
ON caregiver_bestie_links
FOR SELECT
TO authenticated
USING (
  auth.uid() = caregiver_id 
  OR auth.uid() = bestie_id 
  OR has_admin_access(auth.uid())
);