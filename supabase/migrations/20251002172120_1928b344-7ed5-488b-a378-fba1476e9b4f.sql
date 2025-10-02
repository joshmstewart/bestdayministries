-- ========================================
-- SECURITY ENHANCEMENT: Friend Code Improvements
-- Increase entropy from 3 to 4 emojis (8K to 160K combinations)
-- ========================================

-- Update friend_code column to enforce 4-character length
-- First, update any existing 3-emoji codes to 4-emoji codes by adding a random emoji
DO $$
DECLARE
  emojis TEXT[] := ARRAY['🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎺', '🎻', '🎬', '🎮', '🚀', '🛸', '🏀', '⚽', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'];
  random_emoji TEXT;
BEGIN
  -- Update profiles with 3-character friend codes to 4 characters
  UPDATE public.profiles
  SET friend_code = friend_code || emojis[1 + floor(random() * 20)::int]
  WHERE length(friend_code) = 3
    AND friend_code IS NOT NULL;
END $$;

-- Add a check constraint for friend code format (4 emojis)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS friend_code_length_check;
ALTER TABLE public.profiles ADD CONSTRAINT friend_code_length_check 
  CHECK (friend_code IS NULL OR length(friend_code) = 4);

-- Create index on friend_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code 
ON public.profiles(friend_code) 
WHERE friend_code IS NOT NULL;

-- Add comment documenting the security improvement
COMMENT ON COLUMN public.profiles.friend_code IS 
  'Friend code for linking accounts. Uses 4 emojis from a set of 20, providing 160,000 possible combinations (20^4). This prevents enumeration attacks by significantly increasing the search space.';