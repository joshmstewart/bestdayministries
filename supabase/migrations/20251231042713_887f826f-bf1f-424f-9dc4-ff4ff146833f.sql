-- Add video support to album_images table (making it mixed media)
-- Keeping table name for backwards compatibility with existing code

-- Add video-related columns
ALTER TABLE album_images
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'image', -- 'image', 'upload', 'youtube'
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES videos(id) ON DELETE SET NULL;

-- Add constraint to ensure either image or video is present
-- Note: image_url is NOT NULL by default, so we need to allow it to be null for video-only items
ALTER TABLE album_images
ALTER COLUMN image_url DROP NOT NULL;

-- Add a check constraint to ensure at least one media type is present
ALTER TABLE album_images
ADD CONSTRAINT album_media_has_content 
CHECK (
  image_url IS NOT NULL OR 
  video_url IS NOT NULL OR 
  youtube_url IS NOT NULL OR 
  video_id IS NOT NULL
);

-- Add index for video_id lookups
CREATE INDEX IF NOT EXISTS idx_album_images_video_id ON album_images(video_id);

-- Update video_type for existing records to 'image'
UPDATE album_images SET video_type = 'image' WHERE video_type IS NULL AND image_url IS NOT NULL;

-- Add comment documenting the column purpose
COMMENT ON COLUMN album_images.video_type IS 'Media type: image, upload (uploaded video), youtube, or linked (from videos table)';