-- Coloring book pages (admin-uploaded line art)
CREATE TABLE public.coloring_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User's saved colorings
CREATE TABLE public.user_colorings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coloring_page_id UUID NOT NULL REFERENCES public.coloring_pages(id) ON DELETE CASCADE,
  canvas_data TEXT,
  thumbnail_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coloring_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_colorings ENABLE ROW LEVEL SECURITY;

-- Coloring pages policies
CREATE POLICY "Anyone can view active coloring pages"
  ON public.coloring_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coloring pages"
  ON public.coloring_pages FOR ALL
  USING (has_admin_access(auth.uid()));

-- User colorings policies
CREATE POLICY "Users can view their own colorings"
  ON public.user_colorings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own colorings"
  ON public.user_colorings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own colorings"
  ON public.user_colorings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own colorings"
  ON public.user_colorings FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_colorings_user_id ON public.user_colorings(user_id);
CREATE INDEX idx_coloring_pages_active ON public.coloring_pages(is_active, display_order);