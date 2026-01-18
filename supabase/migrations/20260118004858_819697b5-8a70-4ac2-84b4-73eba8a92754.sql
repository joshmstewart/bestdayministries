-- Create table for vendor story media (photos and videos to tell their story)
CREATE TABLE public.vendor_story_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'youtube')),
  media_url TEXT NOT NULL,
  youtube_url TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_story_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Vendors can manage their own story media, public can view active ones
CREATE POLICY "Vendors can view their own story media"
ON public.vendor_story_media
FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR 
  vendor_id IN (
    SELECT vendor_id FROM public.vendor_team_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
  OR
  (is_active = true)
);

CREATE POLICY "Vendors can insert their own story media"
ON public.vendor_story_media
FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR 
  vendor_id IN (
    SELECT vendor_id FROM public.vendor_team_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "Vendors can update their own story media"
ON public.vendor_story_media
FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR 
  vendor_id IN (
    SELECT vendor_id FROM public.vendor_team_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "Vendors can delete their own story media"
ON public.vendor_story_media
FOR DELETE
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR 
  vendor_id IN (
    SELECT vendor_id FROM public.vendor_team_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_story_media;

-- Create trigger for updating updated_at
CREATE TRIGGER update_vendor_story_media_updated_at
BEFORE UPDATE ON public.vendor_story_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();