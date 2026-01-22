-- Create table for pre-generated celebration images per fitness avatar
CREATE TABLE public.fitness_avatar_celebration_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id UUID NOT NULL REFERENCES public.fitness_avatars(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  celebration_type TEXT NOT NULL DEFAULT 'game_win',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_celebration_images_avatar_id ON public.fitness_avatar_celebration_images(avatar_id);
CREATE INDEX idx_celebration_images_active ON public.fitness_avatar_celebration_images(avatar_id, is_active);

-- Enable RLS
ALTER TABLE public.fitness_avatar_celebration_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active celebration images
CREATE POLICY "Anyone can view active celebration images"
ON public.fitness_avatar_celebration_images
FOR SELECT
USING (is_active = true);

-- Admins can manage celebration images
CREATE POLICY "Admins can manage celebration images"
ON public.fitness_avatar_celebration_images
FOR ALL
USING (public.has_admin_access(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fitness_avatar_celebration_images;

-- Add trigger for updated_at
CREATE TRIGGER update_celebration_images_updated_at
BEFORE UPDATE ON public.fitness_avatar_celebration_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();