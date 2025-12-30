-- Add variant_info column to shopping_cart for Printify products
ALTER TABLE public.shopping_cart 
ADD COLUMN IF NOT EXISTS variant_info JSONB;