-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  262144000, -- 250MB in bytes
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
);

-- Create RLS policies for videos bucket
CREATE POLICY "Videos viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  (SELECT has_admin_access(auth.uid()))
);

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' AND
  (SELECT has_admin_access(auth.uid()))
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' AND
  (SELECT has_admin_access(auth.uid()))
);

-- Create videos table to track video metadata
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- duration in seconds
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on videos table
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for videos table
CREATE POLICY "Active videos viewable by everyone"
ON public.videos FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all videos"
ON public.videos FOR SELECT
USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can create videos"
ON public.videos FOR INSERT
WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update videos"
ON public.videos FOR UPDATE
USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete videos"
ON public.videos FOR DELETE
USING (has_admin_access(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();