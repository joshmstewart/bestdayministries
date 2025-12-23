-- Create table for manual product images tied to colors
CREATE TABLE public.product_color_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, color_name, image_url)
);

-- Enable RLS
ALTER TABLE public.product_color_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
ON public.product_color_images
FOR SELECT
USING (true);

-- Admins can manage product images
CREATE POLICY "Admins can manage product images"
ON public.product_color_images
FOR ALL
USING (has_admin_access(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_product_color_images_updated_at
BEFORE UPDATE ON public.product_color_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();