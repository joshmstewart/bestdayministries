-- Add font and color customization fields to sponsor_besties
ALTER TABLE public.sponsor_besties
ADD COLUMN IF NOT EXISTS heading_font TEXT DEFAULT 'serif',
ADD COLUMN IF NOT EXISTS heading_color TEXT DEFAULT '#D4A574',
ADD COLUMN IF NOT EXISTS body_font TEXT DEFAULT 'sans-serif',
ADD COLUMN IF NOT EXISTS body_color TEXT DEFAULT '#000000';