-- Create table to store custom badge images
CREATE TABLE public.chore_badge_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_type TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chore_badge_images ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view badge images
CREATE POLICY "Anyone can view badge images"
  ON public.chore_badge_images
  FOR SELECT
  USING (true);

-- Only admins can manage badge images
CREATE POLICY "Admins can manage badge images"
  ON public.chore_badge_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create storage bucket for badge images
INSERT INTO storage.buckets (id, name, public)
VALUES ('badge-images', 'badge-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for badge images
CREATE POLICY "Anyone can view badge images storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'badge-images');

CREATE POLICY "Admins can upload badge images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'badge-images' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can update badge images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'badge-images' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete badge images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'badge-images' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_chore_badge_images_updated_at
  BEFORE UPDATE ON public.chore_badge_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();