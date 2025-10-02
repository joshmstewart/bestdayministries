-- Remove old friend code columns and constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS unique_friend_code,
DROP CONSTRAINT IF EXISTS friend_code_number_range,
DROP COLUMN IF EXISTS friend_code_emoji,
DROP COLUMN IF EXISTS friend_code_number;

-- Add new friend code column (stores 3 emojis as a single text string)
ALTER TABLE public.profiles
ADD COLUMN friend_code text,
ADD CONSTRAINT unique_friend_code UNIQUE (friend_code);