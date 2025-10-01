-- Add image_url column to discussion_posts for image uploads
ALTER TABLE public.discussion_posts
ADD COLUMN image_url text;