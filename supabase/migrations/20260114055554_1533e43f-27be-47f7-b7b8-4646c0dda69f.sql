-- Create cash register packs table (bundles of stores/customers for coin shop)
CREATE TABLE public.cash_register_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_coins INTEGER NOT NULL DEFAULT 100,
  pack_type TEXT NOT NULL DEFAULT 'mixed' CHECK (pack_type IN ('stores', 'customers', 'mixed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for pack items
CREATE TABLE public.cash_register_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.cash_register_packs(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.cash_register_stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.cash_register_customers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT must_have_one_item CHECK (
    (store_id IS NOT NULL AND customer_id IS NULL) OR 
    (store_id IS NULL AND customer_id IS NOT NULL)
  )
);

-- Create user purchases table
CREATE TABLE public.user_cash_register_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.cash_register_packs(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coins_spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, pack_id)
);

-- Add is_default column to stores and customers to distinguish base content from pack content
ALTER TABLE public.cash_register_stores ADD COLUMN IF NOT EXISTS is_pack_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cash_register_customers ADD COLUMN IF NOT EXISTS is_pack_only BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.cash_register_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cash_register_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies for packs (public read, admin manage)
CREATE POLICY "Anyone can view active packs" ON public.cash_register_packs
  FOR SELECT USING (is_active = true OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage packs" ON public.cash_register_packs
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS policies for pack items (public read, admin manage)
CREATE POLICY "Anyone can view pack items" ON public.cash_register_pack_items
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage pack items" ON public.cash_register_pack_items
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS policies for user purchases
CREATE POLICY "Users can view own purchases" ON public.user_cash_register_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase packs" ON public.user_cash_register_packs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.user_cash_register_packs
  FOR SELECT USING (has_admin_access(auth.uid()));

-- Create indexes
CREATE INDEX idx_cash_register_pack_items_pack_id ON public.cash_register_pack_items(pack_id);
CREATE INDEX idx_cash_register_pack_items_store_id ON public.cash_register_pack_items(store_id);
CREATE INDEX idx_cash_register_pack_items_customer_id ON public.cash_register_pack_items(customer_id);
CREATE INDEX idx_user_cash_register_packs_user_id ON public.user_cash_register_packs(user_id);
CREATE INDEX idx_user_cash_register_packs_pack_id ON public.user_cash_register_packs(pack_id);

-- Trigger for updated_at
CREATE TRIGGER update_cash_register_packs_updated_at
  BEFORE UPDATE ON public.cash_register_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();