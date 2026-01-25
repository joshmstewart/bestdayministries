-- ============================================
-- USPS Calculated Shipping (EasyPost Integration)
-- ============================================

-- 1. Create shipping mode enum
CREATE TYPE public.shipping_mode AS ENUM ('flat', 'calculated');

-- 2. Add shipping fields to vendors table
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS shipping_mode public.shipping_mode DEFAULT 'flat'::public.shipping_mode,
ADD COLUMN IF NOT EXISTS ship_from_zip text,
ADD COLUMN IF NOT EXISTS ship_from_city text,
ADD COLUMN IF NOT EXISTS ship_from_state text,
ADD COLUMN IF NOT EXISTS allowed_carriers text[] DEFAULT ARRAY['USPS']::text[],
ADD COLUMN IF NOT EXISTS flat_rate_amount_cents integer DEFAULT 699,
ADD COLUMN IF NOT EXISTS use_flat_rate_fallback boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.vendors.shipping_mode IS 'flat = use flat rate shipping, calculated = use USPS rates via EasyPost';
COMMENT ON COLUMN public.vendors.ship_from_zip IS 'Required for calculated shipping - origin ZIP code';
COMMENT ON COLUMN public.vendors.allowed_carriers IS 'Carriers vendor wants to use. Phase 1: only USPS active';
COMMENT ON COLUMN public.vendors.flat_rate_amount_cents IS 'Flat rate in cents (699 = $6.99)';
COMMENT ON COLUMN public.vendors.use_flat_rate_fallback IS 'If true, use flat rate when calculated shipping fails';

-- 3. Add weight and shipping fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS weight_oz integer,
ADD COLUMN IF NOT EXISTS ships_separately boolean DEFAULT false;

COMMENT ON COLUMN public.products.weight_oz IS 'Product weight in ounces. Required if vendor uses calculated shipping';
COMMENT ON COLUMN public.products.ships_separately IS 'If true, calculate separate shipment for this item';

-- 4. Add shipping breakdown fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_total_cents integer,
ADD COLUMN IF NOT EXISTS shipping_breakdown jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selected_shipping_service text,
ADD COLUMN IF NOT EXISTS shipping_provider text,
ADD COLUMN IF NOT EXISTS shipping_address_validated boolean DEFAULT false;

COMMENT ON COLUMN public.orders.shipping_breakdown IS 'Per-vendor shipping details: [{vendor_id, amount_cents, service, carrier}]';
COMMENT ON COLUMN public.orders.shipping_provider IS 'easypost or null for flat rate';

-- 5. Add shipping details to order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS shipping_amount_cents integer,
ADD COLUMN IF NOT EXISTS shipping_service text,
ADD COLUMN IF NOT EXISTS shipping_carrier text,
ADD COLUMN IF NOT EXISTS weight_oz integer;

-- 6. Create shipping_rate_cache table for TTL caching
CREATE TABLE IF NOT EXISTS public.shipping_rate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  origin_zip text NOT NULL,
  destination_zip text NOT NULL,
  weight_oz integer NOT NULL,
  rates jsonb NOT NULL,
  cheapest_rate_cents integer NOT NULL,
  cheapest_service text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_shipping_rate_cache_key ON public.shipping_rate_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_shipping_rate_cache_expires ON public.shipping_rate_cache(expires_at);

-- Enable RLS on cache table
ALTER TABLE public.shipping_rate_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage cache (edge functions)
CREATE POLICY "Service role can manage shipping cache" 
ON public.shipping_rate_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 7. Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_shipping_rate_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.shipping_rate_cache
  WHERE expires_at < now();
END;
$$;

-- 8. Create address validation log table (for debugging/analytics)
CREATE TABLE IF NOT EXISTS public.address_validation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  original_address jsonb NOT NULL,
  validated_address jsonb,
  is_valid boolean NOT NULL DEFAULT false,
  validation_messages text[],
  provider text DEFAULT 'easypost',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.address_validation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own address validations" 
ON public.address_validation_log 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin_or_owner());

CREATE POLICY "Users can insert own address validations" 
ON public.address_validation_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 9. Enable realtime for shipping cache cleanup monitoring (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_rate_cache;