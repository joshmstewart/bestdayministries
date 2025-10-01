-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.avatar_url IS 'Stores avatar selection as "avatar-1" through "avatar-34"';