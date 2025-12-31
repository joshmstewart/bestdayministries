-- Add column to store original Printify image URLs for change detection
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS printify_original_images text[] DEFAULT NULL;