-- Add default_image_url column to products table to support custom uploaded images as default
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.products.default_image_url IS 'URL of the default product image - can be from API images array or custom uploaded image';