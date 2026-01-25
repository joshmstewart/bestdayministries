-- Drop and recreate the update policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "Users can update own jokes" ON saved_jokes;

CREATE POLICY "Users can update own jokes" 
ON saved_jokes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);