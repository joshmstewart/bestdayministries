-- First add the columns to discussion_posts
ALTER TABLE public.discussion_posts 
ADD COLUMN IF NOT EXISTS share_to_feed BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.discussion_posts
ADD COLUMN IF NOT EXISTS is_fortune_post BOOLEAN NOT NULL DEFAULT false;