-- Add pricing columns to cash_register_stores table
ALTER TABLE cash_register_stores
ADD COLUMN IF NOT EXISTS price_coins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true;

-- Create user_cash_register_stores table to track which stores users have unlocked
CREATE TABLE IF NOT EXISTS user_cash_register_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES cash_register_stores(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS
ALTER TABLE user_cash_register_stores ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_cash_register_stores
CREATE POLICY "Users can view their own store purchases"
  ON user_cash_register_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store purchases"
  ON user_cash_register_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all store purchases"
  ON user_cash_register_stores FOR SELECT
  USING (is_admin_or_owner());

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_cash_register_stores_user_id ON user_cash_register_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cash_register_stores_store_id ON user_cash_register_stores(store_id);

-- Set existing default stores as free
UPDATE cash_register_stores SET is_free = true, price_coins = 0 WHERE is_default = true;

-- Set non-default stores to have a price (they can be adjusted in admin)
UPDATE cash_register_stores SET is_free = false, price_coins = 100 WHERE is_default = false AND is_pack_only = false;