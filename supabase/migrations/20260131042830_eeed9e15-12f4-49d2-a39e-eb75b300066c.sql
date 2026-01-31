-- Update avatar_emotion_images to use avatar_id (UUID) instead of avatar_number
-- This is needed to link to fitness_avatars table which uses UUIDs

-- First, drop the foreign key constraint
ALTER TABLE public.avatar_emotion_images 
DROP CONSTRAINT IF EXISTS avatar_emotion_images_avatar_number_fkey;

-- Drop the unique constraint
ALTER TABLE public.avatar_emotion_images
DROP CONSTRAINT IF EXISTS avatar_emotion_images_avatar_emotion_unique;

-- Rename the column
ALTER TABLE public.avatar_emotion_images 
RENAME COLUMN avatar_number TO avatar_id;

-- Change the column type to UUID
ALTER TABLE public.avatar_emotion_images 
ALTER COLUMN avatar_id TYPE uuid USING NULL;

-- Add foreign key to fitness_avatars
ALTER TABLE public.avatar_emotion_images
ADD CONSTRAINT avatar_emotion_images_avatar_id_fkey 
FOREIGN KEY (avatar_id) REFERENCES public.fitness_avatars(id) ON DELETE CASCADE;

-- Create new unique constraint
ALTER TABLE public.avatar_emotion_images
ADD CONSTRAINT avatar_emotion_images_avatar_emotion_unique 
UNIQUE (avatar_id, emotion_type_id);