-- Create storage buckets for featured besties
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('featured-bestie-images', 'featured-bestie-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('featured-bestie-audio', 'featured-bestie-audio', true, 10485760, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for featured bestie images (public read, admin write)
CREATE POLICY "Anyone can view featured bestie images"
ON storage.objects FOR SELECT
USING (bucket_id = 'featured-bestie-images');

CREATE POLICY "Admins can upload featured bestie images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'featured-bestie-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update featured bestie images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'featured-bestie-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete featured bestie images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'featured-bestie-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for featured bestie audio (public read, admin write)
CREATE POLICY "Anyone can view featured bestie audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'featured-bestie-audio');

CREATE POLICY "Admins can upload featured bestie audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'featured-bestie-audio'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update featured bestie audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'featured-bestie-audio'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete featured bestie audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'featured-bestie-audio'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add admin policies for featured_besties table
CREATE POLICY "Admins can insert featured besties"
ON public.featured_besties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update featured besties"
ON public.featured_besties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete featured besties"
ON public.featured_besties FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);