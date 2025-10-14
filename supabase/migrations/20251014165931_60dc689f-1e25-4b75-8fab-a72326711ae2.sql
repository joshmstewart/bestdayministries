-- Add aspect_ratio column to discussion_posts table
ALTER TABLE discussion_posts 
ADD COLUMN aspect_ratio text NOT NULL DEFAULT '16:9';