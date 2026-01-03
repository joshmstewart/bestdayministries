-- Add free shipping threshold column to vendors table (default $35)
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric DEFAULT 35.00;

-- Add comment for clarity
COMMENT ON COLUMN public.vendors.free_shipping_threshold IS 'Minimum order subtotal for free shipping from this vendor. Default is $35.';