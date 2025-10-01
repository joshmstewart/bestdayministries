-- Drop the old voice constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_tts_voice;

-- Add updated constraint with all voices including the new fun voices
ALTER TABLE profiles ADD CONSTRAINT valid_tts_voice 
CHECK (tts_voice IN (
  'Aria', 
  'Roger', 
  'Sarah', 
  'Charlie',
  'Johnny Dynamite',
  'Grampa Werthers',
  'Batman',
  'Cherry Twinkle',
  'Creature',
  'Marshal',
  'Austin',
  'Jerry B.',
  'Maverick',
  'Grandma Muffin'
));