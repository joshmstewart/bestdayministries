-- Add RLS UPDATE policy for users to scratch their own cards
CREATE POLICY "Users can scratch their own cards"
ON daily_scratch_cards
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix existing data where cards were scratched but is_scratched wasn't updated
UPDATE daily_scratch_cards 
SET is_scratched = true 
WHERE scratched_at IS NOT NULL 
AND is_scratched = false;