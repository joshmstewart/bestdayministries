-- Create sponsor page sections table for managing component order
CREATE TABLE IF NOT EXISTS public.sponsor_page_sections (
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
ALTER TABLE public.sponsor_page_sections ENABLE ROW LEVEL SECURITY;

-- Admins can manage sponsor page sections
CREATE POLICY "Admins can manage sponsor page sections"
ON public.sponsor_page_sections
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Public read access
CREATE POLICY "Allow public read access to sponsor page sections"
ON public.sponsor_page_sections
FOR SELECT
USING (true);

-- Insert default sections
INSERT INTO public.sponsor_page_sections (section_key, section_name, display_order, is_visible, content) VALUES
('header', 'Header Section', 1, true, '{"badge_text": "Sponsor a Bestie", "main_heading": "Change a Life Today", "description": "Sponsor a Bestie and directly support their journey of growth, creativity, and community engagement"}'::jsonb),
('featured_video', 'Featured Video', 2, true, '{}'::jsonb),
('sponsor_carousel', 'Sponsor Bestie Carousel', 3, true, '{}'::jsonb),
('selection_form', 'Bestie Selection & Sponsorship Form', 4, true, '{}'::jsonb),
('impact_info', 'Impact Information', 5, true, '{}'::jsonb);