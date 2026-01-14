-- Create joke_categories table for purchasable joke categories
CREATE TABLE public.joke_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  coin_price INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_joke_categories to track purchases
CREATE TABLE public.user_joke_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.joke_categories(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coins_spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE public.joke_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_joke_categories ENABLE ROW LEVEL SECURITY;

-- RLS for joke_categories: anyone authenticated can view active categories
CREATE POLICY "Anyone can view active joke categories"
ON public.joke_categories FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage joke categories"
ON public.joke_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- RLS for user_joke_categories: users see their own purchases
CREATE POLICY "Users can view their own category purchases"
ON public.user_joke_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase categories"
ON public.user_joke_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed default categories (all free initially)
INSERT INTO public.joke_categories (name, description, is_free, display_order) VALUES
('animals', 'Jokes about cute animals and pets', true, 1),
('food', 'Silly jokes about food and eating', true, 2),
('weather', 'Funny jokes about sun, rain, and clouds', true, 3),
('family', 'Jokes about family and home', true, 4),
('nature', 'Jokes about trees, flowers, and outdoors', true, 5),
('school', 'Fun jokes about learning and school', true, 6),
('sports', 'Jokes about games and playing', true, 7),
('holidays', 'Jokes for special days and celebrations', true, 8),
('music', 'Jokes about songs and instruments', true, 9),
('random', 'A mix of all kinds of jokes', true, 0);

-- Add category_id to joke_library (keeping existing category text for now)
ALTER TABLE public.joke_library 
ADD COLUMN category_id UUID REFERENCES public.joke_categories(id) ON DELETE SET NULL;

-- Link existing jokes to their categories by name
UPDATE public.joke_library jl
SET category_id = jc.id
FROM public.joke_categories jc
WHERE LOWER(jl.category) = LOWER(jc.name);

-- Create updated_at trigger for joke_categories
CREATE TRIGGER update_joke_categories_updated_at
BEFORE UPDATE ON public.joke_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();