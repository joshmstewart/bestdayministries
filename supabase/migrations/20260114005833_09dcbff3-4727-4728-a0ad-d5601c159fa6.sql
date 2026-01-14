-- Create cash register stores table
CREATE TABLE public.cash_register_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  menu_items JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_register_stores ENABLE ROW LEVEL SECURITY;

-- Everyone can read active stores
CREATE POLICY "Anyone can view active stores"
ON public.cash_register_stores
FOR SELECT
USING (is_active = true);

-- Admins can manage stores
CREATE POLICY "Admins can manage stores"
ON public.cash_register_stores
FOR ALL
USING (public.has_admin_access(auth.uid()));

-- Insert default stores
INSERT INTO public.cash_register_stores (name, description, display_order, is_default) VALUES
('Coffee Shop', 'A cozy café with hot drinks, pastries, and light snacks', 1, true),
('Grocery Store', 'A neighborhood grocery with fresh produce and everyday essentials', 2, false),
('Clothing Store', 'A trendy boutique with fashion items and accessories', 3, false),
('Convenience Store', 'A quick-stop shop with snacks, drinks, and daily necessities', 4, false),
('Bakery', 'A delightful bakery with fresh bread, cakes, and treats', 5, false);

-- Trigger for updated_at
CREATE TRIGGER update_cash_register_stores_updated_at
BEFORE UPDATE ON public.cash_register_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();