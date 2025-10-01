-- Add avatar_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_number integer;

-- Add foreign key constraint to avatars table
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_avatar_number_fkey 
FOREIGN KEY (avatar_number) 
REFERENCES public.avatars(avatar_number);

-- Update existing profiles that have avatar_url to extract the number
UPDATE public.profiles 
SET avatar_number = CASE 
  WHEN avatar_url LIKE 'avatar-%' THEN 
    CAST(REPLACE(avatar_url, 'avatar-', '') AS integer)
  ELSE NULL
END
WHERE avatar_url IS NOT NULL;