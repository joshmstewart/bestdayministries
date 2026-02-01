-- Phase 1.1: Create Coffee Vendor Record
-- This creates a "house vendor" for Best Day Ever Coffee (100% platform revenue)
INSERT INTO public.vendors (
  id,
  user_id,
  business_name,
  status,
  is_house_vendor,
  created_at,
  updated_at
)
SELECT 
  'f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f'::uuid,
  (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1), -- Use first admin user
  'Best Day Ever Coffee',
  'approved',
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.vendors WHERE id = 'f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f'
);

-- Phase 1.2: Add coffee_product_id column to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS coffee_product_id uuid REFERENCES public.coffee_products(id);

-- Add check constraint: either product_id or coffee_product_id is set, not both
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_product_or_coffee_check'
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_or_coffee_check
    CHECK (
      (product_id IS NOT NULL AND coffee_product_id IS NULL) OR
      (product_id IS NULL AND coffee_product_id IS NOT NULL)
    );
  END IF;
END $$;

-- Add index for coffee product lookups
CREATE INDEX IF NOT EXISTS idx_order_items_coffee_product_id 
ON public.order_items(coffee_product_id) 
WHERE coffee_product_id IS NOT NULL;