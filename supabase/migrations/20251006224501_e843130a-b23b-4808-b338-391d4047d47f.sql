-- Create about_sections table to manage About page sections
CREATE TABLE IF NOT EXISTS public.about_sections (
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
ALTER TABLE public.about_sections ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to about sections"
  ON public.about_sections
  FOR SELECT
  USING (true);

-- Admins can manage about sections
CREATE POLICY "Admins can manage about sections"
  ON public.about_sections
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Insert default sections
INSERT INTO public.about_sections (section_key, section_name, display_order, is_visible, content) VALUES
  ('about_content', 'About Content', 1, true, '{"note": "This section shares content with the About section on the homepage. Edit content in Admin > Format Pages > About > About Content."}'),
  ('family_orgs', 'Our Family of Organizations', 2, true, '{}')
ON CONFLICT (section_key) DO NOTHING;