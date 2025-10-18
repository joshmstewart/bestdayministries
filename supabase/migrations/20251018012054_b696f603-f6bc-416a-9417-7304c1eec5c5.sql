-- Add coin_balance column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.coin_balance IS 'User coin balance for purchasing in-app items';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_coin_balance ON profiles(coin_balance);