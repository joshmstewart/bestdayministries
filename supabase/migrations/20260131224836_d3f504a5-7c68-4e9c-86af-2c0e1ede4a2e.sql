-- Create coffee product pricing tiers table
CREATE TABLE public.coffee_product_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.coffee_products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  price_per_unit NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_quantity CHECK (min_quantity > 0),
  CONSTRAINT positive_price CHECK (price_per_unit >= 0),
  UNIQUE(product_id, min_quantity)
);

-- Enable RLS
ALTER TABLE public.coffee_product_tiers ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage coffee product tiers"
  ON public.coffee_product_tiers
  FOR ALL
  USING (public.is_admin_or_owner());

-- Public read for active products
CREATE POLICY "Anyone can view tiers for active products"
  ON public.coffee_product_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coffee_products cp
      WHERE cp.id = product_id AND cp.is_active = true
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_coffee_product_tiers_updated_at
  BEFORE UPDATE ON public.coffee_product_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_coffee_product_tiers_product_id ON public.coffee_product_tiers(product_id);

-- Add comment
COMMENT ON TABLE public.coffee_product_tiers IS 'Quantity-based pricing tiers for coffee products (buy more, pay less per unit)';