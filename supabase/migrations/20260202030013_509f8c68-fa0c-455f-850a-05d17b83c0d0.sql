-- Add optional vendor_sku column for custom vendor product IDs
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS vendor_sku TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.vendor_sku IS 'Optional custom product ID/SKU used by the vendor for their own tracking';

-- Create index for faster lookups by vendor_sku
CREATE INDEX IF NOT EXISTS idx_products_vendor_sku ON public.products(vendor_sku) WHERE vendor_sku IS NOT NULL;