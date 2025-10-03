-- Create vendor status enum
CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create order status enum
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded');

-- Create fulfillment status enum
CREATE TYPE fulfillment_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  stripe_connect_id TEXT,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  status vendor_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  inventory_count INTEGER NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
  is_printify BOOLEAN NOT NULL DEFAULT false,
  printify_product_id TEXT,
  category TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  status order_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10,2) NOT NULL CHECK (price_at_purchase >= 0),
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Shopping cart table
CREATE TABLE public.shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_status ON public.vendors(status);
CREATE INDEX idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_vendor_id ON public.order_items(vendor_id);
CREATE INDEX idx_shopping_cart_user_id ON public.shopping_cart(user_id);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors table
CREATE POLICY "Vendors viewable by everyone" ON public.vendors
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can view all vendors" ON public.vendors
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can view their own vendor profile" ON public.vendors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can apply to become vendors" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Vendors can update their own profile" ON public.vendors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage vendors" ON public.vendors
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS Policies for products table
CREATE POLICY "Active products viewable by everyone" ON public.products
  FOR SELECT USING (
    is_active = true AND 
    (vendor_id IS NULL OR EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = products.vendor_id AND vendors.status = 'approved'
    ))
  );

CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Vendors can view their own products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create products" ON public.products
  FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Approved vendors can create products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = products.vendor_id 
      AND vendors.user_id = auth.uid() 
      AND vendors.status = 'approved'
    )
  );

CREATE POLICY "Admins can update all products" ON public.products
  FOR UPDATE USING (has_admin_access(auth.uid()));

CREATE POLICY "Vendors can update their own products" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (has_admin_access(auth.uid()));

CREATE POLICY "Vendors can delete their own products" ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()
    )
  );

-- RLS Policies for orders table
CREATE POLICY "Customers can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Vendors can view orders containing their products" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_items 
      JOIN public.vendors ON vendors.id = order_items.vendor_id
      WHERE order_items.order_id = orders.id AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (has_admin_access(auth.uid()));

-- RLS Policies for order_items table
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.customer_id = auth.uid() OR has_admin_access(auth.uid()))
    )
  );

CREATE POLICY "Vendors can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = order_items.vendor_id AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "System can create order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update their order items" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE vendors.id = order_items.vendor_id AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update order items" ON public.order_items
  FOR UPDATE USING (has_admin_access(auth.uid()));

-- RLS Policies for shopping_cart table
CREATE POLICY "Users can view their own cart" ON public.shopping_cart
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart" ON public.shopping_cart
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shopping_cart_updated_at
  BEFORE UPDATE ON public.shopping_cart
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();