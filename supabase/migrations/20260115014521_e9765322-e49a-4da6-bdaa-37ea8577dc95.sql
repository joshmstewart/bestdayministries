-- Create card templates table (similar to coloring_books)
CREATE TABLE public.card_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT NOT NULL,
  background_image_url TEXT,
  category TEXT DEFAULT 'general',
  coin_price INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create user cards table (similar to user_colorings)
CREATE TABLE public.user_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.card_templates(id) ON DELETE SET NULL,
  title TEXT,
  canvas_data TEXT,
  thumbnail_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user card purchases table (similar to user_coloring_books)
CREATE TABLE public.user_card_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.card_templates(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Create card likes table (similar to coloring_likes)
CREATE TABLE public.card_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.user_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_likes ENABLE ROW LEVEL SECURITY;

-- Card templates policies (anyone can view active, admins can manage)
CREATE POLICY "Anyone can view active card templates"
  ON public.card_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage card templates"
  ON public.card_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'owner')
  ));

-- User cards policies (users can manage their own, view public)
CREATE POLICY "Users can view their own cards"
  ON public.user_cards FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public cards"
  ON public.user_cards FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own cards"
  ON public.user_cards FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cards"
  ON public.user_cards FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own cards"
  ON public.user_cards FOR DELETE
  USING (user_id = auth.uid());

-- User card templates (purchases) policies
CREATE POLICY "Users can view their own template purchases"
  ON public.user_card_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can purchase templates"
  ON public.user_card_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Card likes policies
CREATE POLICY "Anyone authenticated can view likes"
  ON public.card_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can like cards"
  ON public.card_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes"
  ON public.card_likes FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for user_cards
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_cards;

-- Create trigger for updated_at
CREATE TRIGGER update_card_templates_updated_at
  BEFORE UPDATE ON public.card_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_cards_updated_at
  BEFORE UPDATE ON public.user_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX idx_user_cards_template_id ON public.user_cards(template_id);
CREATE INDEX idx_user_cards_is_public ON public.user_cards(is_public) WHERE is_public = true;
CREATE INDEX idx_card_templates_is_active ON public.card_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_card_likes_card_id ON public.card_likes(card_id);
CREATE INDEX idx_user_card_templates_user_id ON public.user_card_templates(user_id);