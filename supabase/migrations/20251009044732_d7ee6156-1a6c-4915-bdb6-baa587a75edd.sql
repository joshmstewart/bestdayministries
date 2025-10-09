-- Add parent_id column to navigation_links to support dropdown menus
ALTER TABLE public.navigation_links
ADD COLUMN parent_id uuid REFERENCES public.navigation_links(id) ON DELETE CASCADE;

-- Add link_type column to distinguish between regular links and dropdown parents
ALTER TABLE public.navigation_links
ADD COLUMN link_type text NOT NULL DEFAULT 'regular' CHECK (link_type IN ('regular', 'dropdown'));

-- Add index for faster parent-child lookups
CREATE INDEX idx_navigation_links_parent_id ON public.navigation_links(parent_id);

-- Update existing links to have explicit regular type
UPDATE public.navigation_links SET link_type = 'regular' WHERE link_type IS NULL;