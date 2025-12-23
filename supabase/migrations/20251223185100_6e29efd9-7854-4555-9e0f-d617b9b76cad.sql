-- Add Printify mapping fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS printify_blueprint_id INTEGER,
ADD COLUMN IF NOT EXISTS printify_print_provider_id INTEGER,
ADD COLUMN IF NOT EXISTS printify_variant_ids JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_printify_product BOOLEAN DEFAULT false;

-- Add Printify order tracking fields to order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS printify_order_id TEXT,
ADD COLUMN IF NOT EXISTS printify_line_item_id TEXT,
ADD COLUMN IF NOT EXISTS printify_status TEXT DEFAULT 'pending';

-- Create index for faster Printify product lookups
CREATE INDEX IF NOT EXISTS idx_products_printify_blueprint ON public.products(printify_blueprint_id) WHERE printify_blueprint_id IS NOT NULL;

-- Create index for Printify order status checks
CREATE INDEX IF NOT EXISTS idx_order_items_printify_order ON public.order_items(printify_order_id) WHERE printify_order_id IS NOT NULL;

COMMENT ON COLUMN public.products.printify_blueprint_id IS 'Printify blueprint ID for POD products';
COMMENT ON COLUMN public.products.printify_print_provider_id IS 'Printify print provider ID';
COMMENT ON COLUMN public.products.printify_variant_ids IS 'JSON mapping of our variants to Printify variant IDs';
COMMENT ON COLUMN public.products.is_printify_product IS 'Whether this product is fulfilled via Printify';
COMMENT ON COLUMN public.order_items.printify_order_id IS 'Printify order ID after order creation';
COMMENT ON COLUMN public.order_items.printify_line_item_id IS 'Printify line item ID within the order';
COMMENT ON COLUMN public.order_items.printify_status IS 'Current Printify fulfillment status';