-- Add video support to discussion posts
ALTER TABLE discussion_posts 
ADD COLUMN video_id uuid REFERENCES videos(id) ON DELETE SET NULL;