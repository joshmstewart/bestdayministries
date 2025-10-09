-- Add coins column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- Create store items table
CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  required_role user_role,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coin transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_item_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_item_id)
);

-- Enable RLS
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_items
CREATE POLICY "Store items viewable by everyone" ON store_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage store items" ON store_items
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS Policies for coin_transactions
CREATE POLICY "Users can view their own transactions" ON coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON coin_transactions
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert transactions" ON coin_transactions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_purchases
CREATE POLICY "Users can view their own purchases" ON user_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON user_purchases
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can make purchases" ON user_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_created_at ON coin_transactions(created_at DESC);
CREATE INDEX idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX idx_store_items_category ON store_items(category);

-- Create trigger for updated_at
CREATE TRIGGER update_store_items_updated_at
  BEFORE UPDATE ON store_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert some starter store items
INSERT INTO store_items (name, description, price, category, display_order) VALUES
  ('Memory Match - Hard Mode', 'Unlock the challenging Hard difficulty for Memory Match game', 100, 'games', 1),
  ('Ocean Theme', 'Change your app to a beautiful ocean theme with blue colors', 150, 'themes', 2),
  ('Forest Theme', 'Change your app to a peaceful forest theme with green colors', 150, 'themes', 3),
  ('Sunset Theme', 'Change your app to a warm sunset theme with orange and pink colors', 150, 'themes', 4),
  ('Pet Toy - Ball', 'A fun ball for your virtual pet to play with', 50, 'pet_items', 5),
  ('Pet Toy - Frisbee', 'A flying frisbee your pet will love', 75, 'pet_items', 6),
  ('Pet Food - Premium', 'Special premium food that makes your pet extra happy', 80, 'pet_items', 7);