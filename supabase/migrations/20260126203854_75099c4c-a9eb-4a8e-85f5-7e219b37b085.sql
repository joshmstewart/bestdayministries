-- Create coffee_products table for drop-ship vendor products
CREATE TABLE public.coffee_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  shipstation_sku TEXT NOT NULL UNIQUE,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coffee_products ENABLE ROW LEVEL SECURITY;

-- Public can view active products
CREATE POLICY "Anyone can view active coffee products"
ON public.coffee_products
FOR SELECT
USING (is_active = true);

-- Admins can manage all coffee products
CREATE POLICY "Admins can manage coffee products"
ON public.coffee_products
FOR ALL
TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- Create updated_at trigger
CREATE TRIGGER update_coffee_products_updated_at
BEFORE UPDATE ON public.coffee_products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for SKU lookups
CREATE INDEX idx_coffee_products_sku ON public.coffee_products(shipstation_sku);

-- Add comment
COMMENT ON TABLE public.coffee_products IS 'Drop-ship coffee products from external vendor, managed via ShipStation';