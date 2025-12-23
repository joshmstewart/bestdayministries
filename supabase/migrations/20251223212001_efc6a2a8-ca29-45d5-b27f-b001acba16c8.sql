-- Add default_image_index column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_image_index integer DEFAULT 0;