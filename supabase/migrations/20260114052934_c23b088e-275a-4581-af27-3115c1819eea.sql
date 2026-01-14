-- Create storage bucket for currency images
INSERT INTO storage.buckets (id, name, public)
VALUES ('currency-images', 'currency-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create table to track custom currency images
CREATE TABLE public.currency_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  denomination TEXT NOT NULL UNIQUE,
  denomination_type TEXT NOT NULL CHECK (denomination_type IN ('bill', 'coin')),
  image_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currency_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view currency images
CREATE POLICY "Anyone can view currency images"
ON public.currency_images
FOR SELECT
USING (true);

-- Only admins can manage currency images
CREATE POLICY "Admins can manage currency images"
ON public.currency_images
FOR ALL
USING (public.has_admin_access(auth.uid()));

-- Storage policies for currency-images bucket
CREATE POLICY "Anyone can view currency images storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'currency-images');

CREATE POLICY "Admins can upload currency images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'currency-images' AND public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update currency images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'currency-images' AND public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete currency images"
ON storage.objects FOR DELETE
USING (bucket_id = 'currency-images' AND public.has_admin_access(auth.uid()));

-- Insert default denominations (without images - they'll use fallbacks)
INSERT INTO public.currency_images (denomination, denomination_type, image_url, display_name, display_order) VALUES
('100', 'bill', '', '$100 Bill', 1),
('50', 'bill', '', '$50 Bill', 2),
('20', 'bill', '', '$20 Bill', 3),
('10', 'bill', '', '$10 Bill', 4),
('5', 'bill', '', '$5 Bill', 5),
('1', 'bill', '', '$1 Bill', 6),
('0.25', 'coin', '', 'Quarter (25¢)', 7),
('0.10', 'coin', '', 'Dime (10¢)', 8),
('0.05', 'coin', '', 'Nickel (5¢)', 9),
('0.01', 'coin', '', 'Penny (1¢)', 10);