-- Add emoji column to navigation_links table for accessibility
ALTER TABLE public.navigation_links 
ADD COLUMN emoji text DEFAULT NULL;

-- Add comment explaining purpose
COMMENT ON COLUMN public.navigation_links.emoji IS 'Optional emoji to display before the link label for accessibility (helps non-readers identify links)';