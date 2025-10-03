-- Create navigation_links table
CREATE TABLE public.navigation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.navigation_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage navigation links"
ON public.navigation_links
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Navigation links viewable by everyone"
ON public.navigation_links
FOR SELECT
USING (is_active = true);

-- Insert default navigation links
INSERT INTO public.navigation_links (label, href, display_order, created_by) VALUES
  ('Home', '/', 0, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1)),
  ('Posts', '/community', 1, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1)),
  ('Events', '/events', 2, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1)),
  ('Albums', '/gallery', 3, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1)),
  ('Sponsor', '/sponsor-bestie', 4, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1)),
  ('Resources', '/about', 5, (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1));

-- Create trigger for updated_at
CREATE TRIGGER update_navigation_links_updated_at
  BEFORE UPDATE ON public.navigation_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();