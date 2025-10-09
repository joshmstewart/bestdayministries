-- Create user_store_purchases table
CREATE TABLE public.user_store_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_item_id UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS policies for user_store_purchases
ALTER TABLE public.user_store_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.user_store_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
  ON public.user_store_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.user_store_purchases FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update purchases"
  ON public.user_store_purchases FOR UPDATE
  USING (has_admin_access(auth.uid()));

-- Indexes
CREATE INDEX idx_user_purchases_user ON public.user_store_purchases(user_id);
CREATE INDEX idx_user_purchases_item ON public.user_store_purchases(store_item_id);