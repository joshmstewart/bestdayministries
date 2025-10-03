-- Update featured_besties aspect_ratio to use standard format
ALTER TABLE public.featured_besties
ALTER COLUMN aspect_ratio SET DEFAULT '9:16'::text;

-- Add check constraint for featured_besties
ALTER TABLE public.featured_besties
ADD CONSTRAINT featured_besties_aspect_ratio_check 
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

-- Update sponsor_besties aspect_ratio to use standard format
ALTER TABLE public.sponsor_besties
ALTER COLUMN aspect_ratio SET DEFAULT '9:16'::text;

-- Add check constraint for sponsor_besties
ALTER TABLE public.sponsor_besties
ADD CONSTRAINT sponsor_besties_aspect_ratio_check 
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

-- Update existing rows with 'portrait' or 'landscape' to standard formats
UPDATE public.featured_besties
SET aspect_ratio = CASE 
  WHEN aspect_ratio = 'landscape' THEN '16:9'
  WHEN aspect_ratio = 'portrait' THEN '9:16'
  ELSE aspect_ratio
END
WHERE aspect_ratio IN ('landscape', 'portrait');

UPDATE public.sponsor_besties
SET aspect_ratio = CASE 
  WHEN aspect_ratio = 'landscape' THEN '16:9'
  WHEN aspect_ratio = 'portrait' THEN '9:16'
  ELSE aspect_ratio
END
WHERE aspect_ratio IN ('landscape', 'portrait');