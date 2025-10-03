-- Make start_date and end_date nullable in featured_besties table
ALTER TABLE public.featured_besties
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date DROP NOT NULL;