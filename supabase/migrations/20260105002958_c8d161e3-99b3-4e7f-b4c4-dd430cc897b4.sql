-- Allow NULL values in image_url column (we insert first, then generate the icon)
ALTER TABLE public.memory_match_images ALTER COLUMN image_url DROP NOT NULL;