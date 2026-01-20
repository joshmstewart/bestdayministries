-- Add custom_avatar_url column to profiles for custom fitness avatar images
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_avatar_url text,
ADD COLUMN IF NOT EXISTS custom_avatar_type text CHECK (custom_avatar_type IN ('fitness_avatar', 'generated_scene'));

-- Comment for clarity
COMMENT ON COLUMN public.profiles.custom_avatar_url IS 'URL of custom avatar image (either fitness avatar preview or generated scene)';
COMMENT ON COLUMN public.profiles.custom_avatar_type IS 'Type of custom avatar: fitness_avatar (using existing) or generated_scene (AI generated)';

-- Create table for storing generated chore celebration images
CREATE TABLE public.chore_celebration_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  avatar_id uuid REFERENCES public.fitness_avatars(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  activity_category text NOT NULL, -- e.g., 'cleaning', 'organizing', 'cooking', 'personal_care'
  completion_date text NOT NULL, -- YYYY-MM-DD format
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.chore_celebration_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own images
CREATE POLICY "Users can view own chore celebration images"
ON public.chore_celebration_images
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own images  
CREATE POLICY "Users can create own chore celebration images"
ON public.chore_celebration_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own chore celebration images"
ON public.chore_celebration_images
FOR DELETE
USING (auth.uid() = user_id);

-- Guardians can view their linked besties' images
CREATE POLICY "Guardians can view linked bestie chore images"
ON public.chore_celebration_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
    AND bestie_id = chore_celebration_images.user_id
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all chore celebration images"
ON public.chore_celebration_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Create storage bucket for generated profile avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile avatars
CREATE POLICY "Public access to profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Authenticated users can upload profile avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own profile avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);