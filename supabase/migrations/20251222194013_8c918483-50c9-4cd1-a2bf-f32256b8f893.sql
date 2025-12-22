-- Add missing columns to orders table for marketplace checkout
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Make shipping_address nullable for initial checkout (can be collected later or at Stripe)
ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;

-- Update existing orders to use customer_id as user_id if user_id is null
UPDATE orders SET user_id = customer_id WHERE user_id IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id ON orders(stripe_checkout_session_id);