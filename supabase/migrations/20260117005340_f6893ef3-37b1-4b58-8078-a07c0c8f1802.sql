-- Add is_test column to track admin test images vs real workout images
ALTER TABLE public.workout_generated_images 
ADD COLUMN is_test boolean NOT NULL DEFAULT false;