-- Add crop_scale column to avatar_emotion_images table
-- This controls how zoomed in the image appears when displayed in a circle
-- 1.0 = no zoom (full image), 1.5 = 50% zoomed in, 2.0 = 100% zoomed in, etc.
ALTER TABLE public.avatar_emotion_images
ADD COLUMN crop_scale decimal(3,2) DEFAULT 1.0;

-- Add comment explaining the column
COMMENT ON COLUMN public.avatar_emotion_images.crop_scale IS 'Controls the zoom level when displaying in circles. 1.0 = full image, higher = more zoomed in';