-- Drink ingredient categories
CREATE TYPE public.ingredient_category AS ENUM ('base', 'flavor', 'topping', 'extra');

-- Available ingredients for drink creation
CREATE TABLE public.drink_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category ingredient_category NOT NULL,
  description TEXT,
  image_url TEXT, -- Pre-generated image for non-readers
  color_hint TEXT, -- Color hint for AI image generation
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User-created custom drinks
CREATE TABLE public.custom_drinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ingredients UUID[] NOT NULL, -- Array of ingredient IDs
  generated_image_url TEXT, -- AI-generated image stored in storage
  is_public BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Likes for custom drinks
CREATE TABLE public.custom_drink_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drink_id UUID NOT NULL REFERENCES public.custom_drinks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drink_id, user_id)
);

-- Enable RLS
ALTER TABLE public.drink_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_drink_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drink_ingredients (public read, admin manage)
CREATE POLICY "Anyone can view active ingredients"
  ON public.drink_ingredients FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage ingredients"
  ON public.drink_ingredients FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for custom_drinks
CREATE POLICY "Anyone can view public drinks"
  ON public.custom_drinks FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create drinks"
  ON public.custom_drinks FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own drinks"
  ON public.custom_drinks FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own drinks"
  ON public.custom_drinks FOR DELETE
  USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all drinks"
  ON public.custom_drinks FOR ALL
  USING (has_admin_access(auth.uid()));

-- RLS Policies for likes
CREATE POLICY "Anyone can view likes"
  ON public.custom_drink_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.custom_drink_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes"
  ON public.custom_drink_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_drink_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_drinks SET likes_count = likes_count + 1 WHERE id = NEW.drink_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_drinks SET likes_count = likes_count - 1 WHERE id = OLD.drink_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_drink_likes_count_trigger
AFTER INSERT OR DELETE ON public.custom_drink_likes
FOR EACH ROW EXECUTE FUNCTION public.update_drink_likes_count();

-- Create storage bucket for drink images
INSERT INTO storage.buckets (id, name, public) VALUES ('drink-images', 'drink-images', true);

-- Storage policies
CREATE POLICY "Anyone can view drink images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'drink-images');

CREATE POLICY "Authenticated users can upload drink images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'drink-images' AND auth.uid() IS NOT NULL);

-- Seed some initial ingredients
INSERT INTO public.drink_ingredients (name, category, description, color_hint, display_order) VALUES
-- Bases
('Espresso', 'base', 'Rich, bold coffee shot', 'dark brown', 1),
('Cold Brew', 'base', 'Smooth, cold-steeped coffee', 'deep brown', 2),
('Matcha', 'base', 'Earthy green tea powder', 'vibrant green', 3),
('Chai', 'base', 'Spiced tea blend', 'warm brown', 4),
('Hot Chocolate', 'base', 'Rich cocoa base', 'chocolate brown', 5),
-- Flavors
('Vanilla', 'flavor', 'Classic sweet vanilla', 'cream', 1),
('Caramel', 'flavor', 'Buttery sweet caramel', 'golden amber', 2),
('Hazelnut', 'flavor', 'Nutty and smooth', 'light brown', 3),
('Lavender', 'flavor', 'Floral and calming', 'purple', 4),
('Cinnamon', 'flavor', 'Warm spice', 'reddish brown', 5),
('Honey', 'flavor', 'Natural sweetness', 'golden', 6),
-- Toppings
('Whipped Cream', 'topping', 'Fluffy sweet cream', 'white', 1),
('Foam', 'topping', 'Silky milk foam', 'white', 2),
('Chocolate Drizzle', 'topping', 'Rich chocolate sauce', 'dark brown', 3),
('Caramel Drizzle', 'topping', 'Sweet caramel sauce', 'golden', 4),
('Cinnamon Sprinkle', 'topping', 'Dusted cinnamon', 'reddish brown', 5),
-- Extras
('Oat Milk', 'extra', 'Creamy oat-based milk', 'cream', 1),
('Almond Milk', 'extra', 'Light nutty milk', 'light cream', 2),
('Extra Shot', 'extra', 'Double the caffeine', 'dark brown', 3),
('Ice', 'extra', 'Make it iced', 'clear', 4),
('Marshmallows', 'extra', 'Fluffy sweet treats', 'white and pink', 5);