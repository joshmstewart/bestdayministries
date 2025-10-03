-- Create community_quick_links table
CREATE TABLE public.community_quick_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Link',
  color TEXT NOT NULL DEFAULT 'from-primary/20 to-secondary/5',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.community_quick_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Quick links viewable by everyone"
ON public.community_quick_links
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quick links"
ON public.community_quick_links
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_community_quick_links_updated_at
BEFORE UPDATE ON public.community_quick_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();