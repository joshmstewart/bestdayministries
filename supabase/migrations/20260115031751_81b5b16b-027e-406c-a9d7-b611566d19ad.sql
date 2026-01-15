-- Create card word arts table for pre-generated word art images
CREATE TABLE public.card_word_arts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  phrase VARCHAR(200) NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.card_word_arts ENABLE ROW LEVEL SECURITY;

-- Everyone can view active word arts
CREATE POLICY "Anyone can view active word arts"
ON public.card_word_arts
FOR SELECT
USING (is_active = true);

-- Admins can manage word arts
CREATE POLICY "Admins can manage word arts"
ON public.card_word_arts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Create index for faster queries
CREATE INDEX idx_card_word_arts_template ON public.card_word_arts(template_id);
CREATE INDEX idx_card_word_arts_active ON public.card_word_arts(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_card_word_arts_updated_at
BEFORE UPDATE ON public.card_word_arts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();