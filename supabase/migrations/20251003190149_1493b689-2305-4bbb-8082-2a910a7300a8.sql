-- Create community_sections table for managing section order and visibility
CREATE TABLE IF NOT EXISTS public.community_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_sections ENABLE ROW LEVEL SECURITY;

-- Admins can manage community sections
CREATE POLICY "Admins can manage community sections"
ON public.community_sections
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Allow public read access to community sections
CREATE POLICY "Allow public read access to community sections"
ON public.community_sections
FOR SELECT
TO authenticated
USING (true);

-- Insert default sections with display order
INSERT INTO public.community_sections (section_key, section_name, display_order, is_visible, content) VALUES
('welcome', 'Welcome Section', 1, true, '{"title": "Welcome to Your Best Day Ministries Community", "subtitle": "Connect, share, and grow with our amazing community"}'::jsonb),
('featured_item', 'Featured Item', 2, true, '{}'::jsonb),
('featured_bestie', 'Featured Bestie', 3, true, '{}'::jsonb),
('sponsor_bestie', 'Sponsor a Bestie', 4, true, '{}'::jsonb),
('latest_discussion', 'Latest Discussion', 5, true, '{}'::jsonb),
('upcoming_events', 'Upcoming Events', 6, true, '{}'::jsonb),
('latest_album', 'Latest Album', 7, true, '{}'::jsonb),
('our_family', 'Our Family', 8, true, '{}'::jsonb),
('quick_links', 'Quick Links', 9, true, '{}'::jsonb);