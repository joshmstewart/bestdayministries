-- Add content page support to guardian_resources
ALTER TABLE public.guardian_resources 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS has_content_page BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.guardian_resources.content IS 'Rich HTML content for full page resources';
COMMENT ON COLUMN public.guardian_resources.has_content_page IS 'If true, resource has internal content page; if false, just external link';
COMMENT ON COLUMN public.guardian_resources.cover_image_url IS 'Cover image for the resource';
COMMENT ON COLUMN public.guardian_resources.attachments IS 'Array of file attachments with name and url';

-- Create storage bucket for guardian resource images
INSERT INTO storage.buckets (id, name, public)
VALUES ('guardian-resources', 'guardian-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for guardian resources bucket
CREATE POLICY "Anyone can view guardian resource files"
ON storage.objects FOR SELECT
USING (bucket_id = 'guardian-resources');

CREATE POLICY "Admins can upload guardian resource files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'guardian-resources' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can update guardian resource files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'guardian-resources' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can delete guardian resource files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'guardian-resources' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);