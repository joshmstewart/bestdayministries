-- Add theme_color column to vendors table
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'orange';