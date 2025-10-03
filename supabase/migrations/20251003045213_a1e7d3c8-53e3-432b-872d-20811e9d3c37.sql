-- Drop the old aspect ratio check constraint that only allowed 'landscape' and 'portrait'
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_aspect_ratio_check;

-- Add new check constraint with all common aspect ratios
ALTER TABLE public.events
ADD CONSTRAINT events_aspect_ratio_check 
CHECK (aspect_ratio = ANY (ARRAY[
  '1:1'::text,
  '16:9'::text,
  '9:16'::text,
  '4:3'::text,
  '3:4'::text,
  '3:2'::text,
  '2:3'::text,
  'landscape'::text,
  'portrait'::text,
  'square'::text
]));

-- Update the default value to match UI default
ALTER TABLE public.events
ALTER COLUMN aspect_ratio SET DEFAULT '9:16'::text;

-- Update any existing rows that have invalid aspect ratios
UPDATE public.events
SET aspect_ratio = CASE 
  WHEN aspect_ratio = 'landscape' THEN '16:9'
  WHEN aspect_ratio = 'portrait' THEN '9:16'
  ELSE '9:16'
END
WHERE aspect_ratio NOT IN ('1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', 'square');