-- Create newsletter templates table
CREATE TABLE public.newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  subject_template TEXT NOT NULL,
  preview_text_template TEXT,
  html_content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_newsletter_templates_category ON public.newsletter_templates(category);
CREATE INDEX idx_newsletter_templates_created_by ON public.newsletter_templates(created_by);

-- Enable RLS
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage templates"
  ON public.newsletter_templates
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Active templates viewable by authenticated users"
  ON public.newsletter_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_newsletter_templates_updated_at
  BEFORE UPDATE ON public.newsletter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.newsletter_templates IS 'Reusable email newsletter templates with HTML content';
COMMENT ON COLUMN public.newsletter_templates.category IS 'Template category: general, announcement, promotion, welcome, etc.';