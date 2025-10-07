-- Add YouTube video support to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'upload' CHECK (video_type IN ('upload', 'youtube')),
ADD COLUMN IF NOT EXISTS youtube_url text;

-- Add comment for clarity
COMMENT ON COLUMN videos.video_type IS 'Type of video: upload (hosted file) or youtube (embedded)';
COMMENT ON COLUMN videos.youtube_url IS 'YouTube video URL or ID for embedded videos';