-- Add column to store original uncropped image URL
ALTER TABLE album_images ADD COLUMN IF NOT EXISTS original_image_url TEXT;

-- For existing images, set original_image_url to the current image_url
-- (these won't have originals, but at least they'll have a reference)
UPDATE album_images 
SET original_image_url = image_url 
WHERE original_image_url IS NULL;