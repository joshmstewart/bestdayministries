-- Remove description column from sponsor_besties as it's being replaced by text_sections
ALTER TABLE public.sponsor_besties
DROP COLUMN IF EXISTS description;

-- Remove old font/color columns as styling is now automatic
ALTER TABLE public.sponsor_besties
DROP COLUMN IF EXISTS heading_font,
DROP COLUMN IF EXISTS heading_color,
DROP COLUMN IF EXISTS body_font,
DROP COLUMN IF EXISTS body_color;

-- Ensure text_sections has a default
ALTER TABLE public.sponsor_besties
ALTER COLUMN text_sections SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sponsor_besties.text_sections IS 'Array of sections with header and text. Styling is automatic: headers use serif/#D4A574/2rem, text uses sans-serif/#000000/1rem';