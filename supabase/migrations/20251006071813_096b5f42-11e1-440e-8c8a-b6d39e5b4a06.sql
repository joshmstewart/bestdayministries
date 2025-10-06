-- Add album_id column to discussion_posts to link posts to albums
ALTER TABLE discussion_posts 
ADD COLUMN album_id uuid REFERENCES albums(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_discussion_posts_album_id ON discussion_posts(album_id);

-- Add comment for documentation
COMMENT ON COLUMN discussion_posts.album_id IS 'Links discussion posts to albums when an album is also displayed as a post';