-- Create coffee shop menu categories table
CREATE TABLE public.coffee_shop_menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coffee shop menu items table
CREATE TABLE public.coffee_shop_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.coffee_shop_menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Flexible pricing: can have multiple price tiers or single price
  price_small DECIMAL(10,2),
  price_large DECIMAL(10,2),
  -- For items with 4 size options (coffee drinks)
  price_hot_12oz DECIMAL(10,2),
  price_hot_16oz DECIMAL(10,2),
  price_iced_16oz DECIMAL(10,2),
  price_iced_24oz DECIMAL(10,2),
  -- Single price for simple items
  single_price DECIMAL(10,2),
  -- Display configuration
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for menu add-ons (like espresso shot, milk substitutes)
CREATE TABLE public.coffee_shop_menu_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.coffee_shop_menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coffee_shop_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_shop_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_shop_menu_addons ENABLE ROW LEVEL SECURITY;

-- Public read access (menu is public)
CREATE POLICY "Anyone can view active menu categories"
  ON public.coffee_shop_menu_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view active menu items"
  ON public.coffee_shop_menu_items
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view active menu addons"
  ON public.coffee_shop_menu_addons
  FOR SELECT
  USING (is_active = true);

-- Admin full access using get_user_role function
CREATE POLICY "Admins can manage menu categories"
  ON public.coffee_shop_menu_categories
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can manage menu items"
  ON public.coffee_shop_menu_items
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can manage menu addons"
  ON public.coffee_shop_menu_addons
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coffee_shop_menu_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coffee_shop_menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coffee_shop_menu_addons;

-- Create update trigger for timestamps
CREATE TRIGGER update_coffee_shop_menu_categories_updated_at
  BEFORE UPDATE ON public.coffee_shop_menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coffee_shop_menu_items_updated_at
  BEFORE UPDATE ON public.coffee_shop_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();