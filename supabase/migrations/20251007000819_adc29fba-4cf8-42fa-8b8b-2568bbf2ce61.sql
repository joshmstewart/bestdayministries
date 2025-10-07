-- Create support_page_sections table for managing Support Us page content and order
CREATE TABLE IF NOT EXISTS public.support_page_sections (
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
ALTER TABLE public.support_page_sections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage support page sections"
  ON public.support_page_sections
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Allow public read access to support page sections"
  ON public.support_page_sections
  FOR SELECT
  USING (true);

-- Insert default sections
INSERT INTO public.support_page_sections (section_key, section_name, display_order, is_visible, content) VALUES
  ('header', 'Page Header', 0, true, '{"badge_text": "Support Our Mission", "heading": "Ways to Support Us", "subtitle": "Your support empowers adults with disabilities through community, creativity, and opportunity"}'::jsonb),
  ('sponsor_bestie', 'Sponsor a Bestie Section', 1, true, '{"title": "Sponsor a Bestie", "description": "Make a direct impact by sponsoring a community member''s journey"}'::jsonb),
  ('other_ways', 'Other Ways to Give', 2, true, '{"title": "Other Ways to Give", "description": "Choose the giving option that works best for you"}'::jsonb),
  ('wishlists', 'Shop Our Wishlists', 3, true, '{"title": "Shop Our Wishlists", "description": "Purchase items we need directly from our wishlists"}'::jsonb),
  ('impact', 'Impact Section', 4, true, '{"title": "Your Support Makes a Difference", "items": ["Bestie mentoring and job training programs", "Career development and entrepreneurial opportunities", "Community events and crafting nights", "Expanding Best Day Ministries locations nationwide"]}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;