-- Make customer_id nullable for guest checkout support
ALTER TABLE public.orders ALTER COLUMN customer_id DROP NOT NULL;

-- Add customer_email for guest orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;

-- Add index for looking up orders by email (for guests)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);

-- Update RLS to allow guests to view their orders by session/email
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = customer_id
  );

-- Allow inserts for authenticated users or via service role (for guest checkout)
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR customer_email IS NOT NULL
  );