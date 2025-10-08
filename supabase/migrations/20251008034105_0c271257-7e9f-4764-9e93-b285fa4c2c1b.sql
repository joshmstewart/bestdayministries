-- Help Center: Product Tours
CREATE TABLE public.help_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- 'all', 'bestie', 'caregiver', 'supporter', 'vendor', 'admin'
  category TEXT NOT NULL DEFAULT 'general', -- 'general', 'feature', 'role-specific'
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Joyride step objects
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  duration_minutes INTEGER, -- Estimated completion time
  icon TEXT NOT NULL DEFAULT 'HelpCircle',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Help Center: Guides
CREATE TABLE public.help_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  category TEXT NOT NULL DEFAULT 'general',
  target_audience TEXT NOT NULL DEFAULT 'all',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  reading_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Help Center: FAQs
CREATE TABLE public.help_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  target_audience TEXT NOT NULL DEFAULT 'all',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies for help_tours
ALTER TABLE public.help_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help tours viewable by everyone"
  ON public.help_tours FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage help tours"
  ON public.help_tours FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for help_guides
ALTER TABLE public.help_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help guides viewable by everyone"
  ON public.help_guides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage help guides"
  ON public.help_guides FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for help_faqs
ALTER TABLE public.help_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Help FAQs viewable by everyone"
  ON public.help_faqs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage help FAQs"
  ON public.help_faqs FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));