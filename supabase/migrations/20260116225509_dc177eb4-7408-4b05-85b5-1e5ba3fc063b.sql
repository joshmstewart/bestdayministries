-- Add view_count column to products table for tracking product views
ALTER TABLE public.products ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create index for efficient sorting by views
CREATE INDEX idx_products_view_count ON public.products(view_count DESC);

-- Create a table to track individual product views (for analytics)
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT
);

-- Enable RLS on product_views
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert views (for tracking)
CREATE POLICY "Anyone can insert product views" 
ON public.product_views 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view the raw data
CREATE POLICY "Admins can view product views" 
ON public.product_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'owner')
  )
);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_product_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products 
  SET view_count = view_count + 1 
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-increment view count when a view is recorded
CREATE TRIGGER on_product_view_increment
AFTER INSERT ON public.product_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_product_view_count();

-- Add index for efficient querying by product
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_viewed_at ON public.product_views(viewed_at DESC);