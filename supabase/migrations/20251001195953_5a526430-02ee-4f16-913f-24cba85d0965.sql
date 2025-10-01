-- Add is_public column to albums table
ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Add is_public column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Update the comment to explain the column
COMMENT ON COLUMN albums.is_public IS 'When true, album appears on public homepage. Always visible on community page.';
COMMENT ON COLUMN events.is_public IS 'When true, event appears on public homepage. Always visible on community page.';