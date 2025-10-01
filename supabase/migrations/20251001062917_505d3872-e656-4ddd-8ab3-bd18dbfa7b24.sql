-- Create albums table
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create album_images table
CREATE TABLE public.album_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for albums
CREATE POLICY "Albums viewable by everyone"
ON public.albums FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and owners can create albums"
ON public.albums FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can update albums"
ON public.albums FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can delete albums"
ON public.albums FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- RLS Policies for album_images
CREATE POLICY "Album images viewable by everyone"
ON public.album_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.albums
    WHERE albums.id = album_images.album_id
    AND albums.is_active = true
  )
);

CREATE POLICY "Admins and owners can manage album images"
ON public.album_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Create storage bucket for album images
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-images', 'album-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for album-images
CREATE POLICY "Album images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'album-images');

CREATE POLICY "Authenticated users can upload album images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'album-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update album images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'album-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete album images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'album-images' 
  AND auth.role() = 'authenticated'
);

-- Add trigger for updated_at
CREATE TRIGGER update_albums_updated_at
BEFORE UPDATE ON public.albums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();