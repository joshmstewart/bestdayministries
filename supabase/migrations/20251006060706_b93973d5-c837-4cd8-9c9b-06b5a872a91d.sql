-- Add user_id column to sponsorship_receipts
ALTER TABLE sponsorship_receipts 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Populate existing receipts with user_id from sponsorships
UPDATE sponsorship_receipts sr
SET user_id = s.sponsor_id
FROM sponsorships s
WHERE sr.sponsorship_id = s.id
AND sr.user_id IS NULL;

-- Drop the problematic policy and function
DROP POLICY IF EXISTS "Users can view their own receipts by email" ON sponsorship_receipts;
DROP FUNCTION IF EXISTS public.get_user_email(uuid);

-- Create proper RLS policy using user_id
CREATE POLICY "Users can view their own receipts"
ON sponsorship_receipts
FOR SELECT
USING (auth.uid() = user_id);