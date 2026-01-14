-- Create cash register customers table
CREATE TABLE public.cash_register_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  character_type TEXT NOT NULL, -- e.g., "grandma", "soccer player", "punk rocker"
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_register_customers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active customers"
ON public.cash_register_customers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage customers"
ON public.cash_register_customers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_cash_register_customers_updated_at
BEFORE UPDATE ON public.cash_register_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();