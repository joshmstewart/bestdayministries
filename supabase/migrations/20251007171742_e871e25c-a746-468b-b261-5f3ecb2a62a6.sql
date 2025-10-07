-- Add youtube_url column to discussion_posts for direct YouTube embeds
ALTER TABLE discussion_posts 
ADD COLUMN youtube_url text;