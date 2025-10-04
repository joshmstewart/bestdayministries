-- Step 1: Drop the constraint first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS friend_code_length_check;

-- Step 2: Update any existing 4-emoji codes to 3 emojis
UPDATE profiles 
SET friend_code = SUBSTRING(friend_code, 1, 3)
WHERE friend_code IS NOT NULL AND CHAR_LENGTH(friend_code) > 3;

-- Step 3: Add back the constraint for 3-emoji codes
-- Using CHAR_LENGTH instead of LENGTH for proper emoji counting
ALTER TABLE profiles ADD CONSTRAINT friend_code_length_check 
  CHECK (friend_code IS NULL OR CHAR_LENGTH(friend_code) = 3);