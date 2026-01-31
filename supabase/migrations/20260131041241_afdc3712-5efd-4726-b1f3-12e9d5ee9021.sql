-- Create table to store generated avatar emotion images
CREATE TABLE public.avatar_emotion_images (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    avatar_number INTEGER NOT NULL REFERENCES public.avatars(avatar_number) ON DELETE CASCADE,
    emotion_type_id UUID NOT NULL REFERENCES public.emotion_types(id) ON DELETE CASCADE,
    image_url TEXT,
    prompt_used TEXT,
    generation_notes TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(avatar_number, emotion_type_id)
);

-- Enable RLS
ALTER TABLE public.avatar_emotion_images ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to view approved images
CREATE POLICY "Anyone can view approved avatar emotion images"
ON public.avatar_emotion_images
FOR SELECT
TO authenticated
USING (is_approved = true);

-- Allow admins to view all images
CREATE POLICY "Admins can view all avatar emotion images"
ON public.avatar_emotion_images
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Allow admins to insert/update/delete
CREATE POLICY "Admins can manage avatar emotion images"
ON public.avatar_emotion_images
FOR ALL
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_avatar_emotion_images_updated_at
BEFORE UPDATE ON public.avatar_emotion_images
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();