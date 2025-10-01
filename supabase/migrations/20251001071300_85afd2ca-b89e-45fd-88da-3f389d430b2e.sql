-- Add voice preference column to profiles table
ALTER TABLE profiles 
ADD COLUMN tts_voice text DEFAULT 'Aria';

-- Add a check constraint to ensure valid voice names
ALTER TABLE profiles
ADD CONSTRAINT valid_tts_voice CHECK (
  tts_voice IN ('Aria', 'Roger', 'Sarah', 'Charlie')
);