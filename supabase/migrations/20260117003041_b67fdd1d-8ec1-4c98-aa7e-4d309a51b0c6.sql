-- Create table for user's enabled workout locations
CREATE TABLE public.user_workout_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.workout_locations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_workout_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own enabled locations
CREATE POLICY "Users can view their own enabled locations"
ON public.user_workout_locations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own location preferences
CREATE POLICY "Users can insert their own location preferences"
ON public.user_workout_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own location preferences
CREATE POLICY "Users can update their own location preferences"
ON public.user_workout_locations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own location preferences
CREATE POLICY "Users can delete their own location preferences"
ON public.user_workout_locations
FOR DELETE
USING (auth.uid() = user_id);

-- Add image_url column to fitness_avatars for the generated AI image
ALTER TABLE public.fitness_avatars ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add location_name column to workout_generated_images to track where the activity was done
ALTER TABLE public.workout_generated_images ADD COLUMN IF NOT EXISTS location_name TEXT;