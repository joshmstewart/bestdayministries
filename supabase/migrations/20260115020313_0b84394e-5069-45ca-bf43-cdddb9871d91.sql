-- Create card_designs table (like coloring_pages for coloring_books)
CREATE TABLE public.card_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'easy',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.card_designs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active card designs"
ON public.card_designs FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage card designs"
ON public.card_designs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Add index for faster template lookups
CREATE INDEX idx_card_designs_template_id ON public.card_designs(template_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_designs;