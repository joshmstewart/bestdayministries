-- Create table for homepage section ordering
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  section_name text NOT NULL,
  display_order integer NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Admins can manage sections
CREATE POLICY "Admins can manage homepage sections"
ON public.homepage_sections
FOR ALL
USING (has_admin_access(auth.uid()));

-- Everyone can view sections
CREATE POLICY "Homepage sections viewable by everyone"
ON public.homepage_sections
FOR SELECT
USING (true);

-- Insert default section order
INSERT INTO public.homepage_sections (section_key, section_name, display_order, is_visible) VALUES
  ('hero', 'Hero Banner', 1, true),
  ('featured_bestie', 'Featured Bestie', 2, true),
  ('mission', 'Mission Statement', 3, true),
  ('community_features', 'Community Features', 4, true),
  ('our_family', 'Our Family', 5, true),
  ('latest_album', 'Latest Album', 6, true),
  ('public_events', 'Public Events', 7, true),
  ('community_gallery', 'Community Gallery', 8, true),
  ('joy_rocks', 'Joy Rocks', 9, true),
  ('donate', 'Donate', 10, true),
  ('about', 'About Us', 11, true);

-- Create trigger for updated_at
CREATE TRIGGER update_homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();