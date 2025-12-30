-- Add session_id to shopping_cart for guest users
ALTER TABLE public.shopping_cart ADD COLUMN IF NOT EXISTS session_id text;

-- Make user_id nullable for guest carts
ALTER TABLE public.shopping_cart ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: must have either user_id or session_id
ALTER TABLE public.shopping_cart DROP CONSTRAINT IF EXISTS cart_user_or_session_check;
ALTER TABLE public.shopping_cart ADD CONSTRAINT cart_user_or_session_check 
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL);

-- Add index for session lookups
CREATE INDEX IF NOT EXISTS idx_shopping_cart_session_id ON public.shopping_cart(session_id);

-- Update RLS policies for guest cart access
DROP POLICY IF EXISTS "Users can view their own cart" ON public.shopping_cart;
CREATE POLICY "Users can view their own cart" ON public.shopping_cart
  FOR SELECT USING (
    auth.uid() = user_id 
    OR session_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can insert to their own cart" ON public.shopping_cart;
CREATE POLICY "Users can insert to their own cart" ON public.shopping_cart
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can update their own cart" ON public.shopping_cart;
CREATE POLICY "Users can update their own cart" ON public.shopping_cart
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR session_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete from their own cart" ON public.shopping_cart;
CREATE POLICY "Users can delete from their own cart" ON public.shopping_cart
  FOR DELETE USING (
    auth.uid() = user_id 
    OR session_id IS NOT NULL
  );