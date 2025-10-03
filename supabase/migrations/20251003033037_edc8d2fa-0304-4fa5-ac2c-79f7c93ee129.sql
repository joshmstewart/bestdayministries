-- First, update any rows with custom voice values to use Aria as default
UPDATE public.profiles 
SET tts_voice = 'Aria' 
WHERE tts_voice NOT IN ('Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River', 'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill');

-- Drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_tts_voice;

-- Add updated constraint with both standard and custom voices
ALTER TABLE public.profiles ADD CONSTRAINT valid_tts_voice 
CHECK (tts_voice IN (
  -- Standard ElevenLabs voices
  'Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River', 'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill',
  -- Custom voices (using lowercase with hyphens as IDs)
  'austin', 'batman', 'cherry-twinkle', 'creature', 'grandma-muffin', 'grandpa-werthers', 'jerry-b', 'johnny-dynamite', 'marshal', 'maverick'
));