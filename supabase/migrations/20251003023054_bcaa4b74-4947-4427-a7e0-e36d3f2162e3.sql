-- Create family_organizations table
CREATE TABLE public.family_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'Heart',
  color text NOT NULL DEFAULT 'from-primary/20 to-primary-variant/20',
  button_text text NOT NULL DEFAULT 'Visit Website',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create footer_sections table
CREATE TABLE public.footer_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create footer_links table
CREATE TABLE public.footer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.footer_sections(id) ON DELETE CASCADE,
  label text NOT NULL,
  href text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_organizations
CREATE POLICY "Family orgs viewable by everyone"
ON public.family_organizations FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage family orgs"
ON public.family_organizations FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- RLS policies for footer_sections
CREATE POLICY "Footer sections viewable by everyone"
ON public.footer_sections FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage footer sections"
ON public.footer_sections FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- RLS policies for footer_links
CREATE POLICY "Footer links viewable by everyone"
ON public.footer_links FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage footer links"
ON public.footer_links FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Add indexes
CREATE INDEX idx_family_orgs_active ON public.family_organizations(is_active, display_order);
CREATE INDEX idx_footer_sections_active ON public.footer_sections(is_active, display_order);
CREATE INDEX idx_footer_links_section ON public.footer_links(section_id, display_order);

-- Insert default data for family organizations
INSERT INTO public.family_organizations (name, description, url, icon, color, button_text, display_order, created_by)
SELECT 
  'Best Day Ever Coffee + Crepes',
  'A community-centered coffee shop where everyone belongs. Delicious food and drinks served with love.',
  'https://bestdayevercoffeeandcrepes.com',
  'Coffee',
  'from-amber-500/20 to-orange-500/20',
  'Visit Website',
  0,
  (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO public.family_organizations (name, description, url, icon, color, button_text, display_order, created_by)
SELECT 
  'Best Day Ministries',
  'Our main ministry empowering adults with special needs through creativity, community, and connection.',
  '#about',
  'Heart',
  'from-primary/20 to-primary-variant/20',
  'Learn More',
  1,
  (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);