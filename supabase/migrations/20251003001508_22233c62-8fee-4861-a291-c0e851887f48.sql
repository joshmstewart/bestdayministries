-- Create featured_items table
CREATE TABLE public.featured_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT NOT NULL,
  link_text TEXT DEFAULT 'Learn More',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Featured items viewable by everyone"
  ON public.featured_items
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage featured items"
  ON public.featured_items
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_featured_items_updated_at
  BEFORE UPDATE ON public.featured_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();