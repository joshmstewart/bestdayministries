-- Create recipe_ingredients table similar to drink_ingredients
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'pantry',
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies: public read, admin write
CREATE POLICY "Anyone can view active recipe ingredients"
  ON public.recipe_ingredients
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage recipe ingredients"
  ON public.recipe_ingredients
  FOR ALL
  USING (has_admin_access(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_recipe_ingredients_updated_at
  BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert common ingredients with categories
INSERT INTO public.recipe_ingredients (name, category, display_order) VALUES
-- Proteins
('Eggs', 'protein', 1),
('Chicken', 'protein', 2),
('Ground Beef', 'protein', 3),
('Bacon', 'protein', 4),
('Ham', 'protein', 5),
('Tuna', 'protein', 6),
('Sausage', 'protein', 7),
('Hot Dogs', 'protein', 8),
-- Dairy
('Cheese', 'dairy', 10),
('Milk', 'dairy', 11),
('Butter', 'dairy', 12),
('Yogurt', 'dairy', 13),
('Cream Cheese', 'dairy', 14),
('Sour Cream', 'dairy', 15),
-- Bread & Grains
('Bread', 'grains', 20),
('Pasta', 'grains', 21),
('Rice', 'grains', 22),
('Tortillas', 'grains', 23),
('Oatmeal', 'grains', 24),
('Cereal', 'grains', 25),
('Crackers', 'grains', 26),
-- Fruits
('Apples', 'fruits', 30),
('Bananas', 'fruits', 31),
('Oranges', 'fruits', 32),
('Strawberries', 'fruits', 33),
('Grapes', 'fruits', 34),
('Blueberries', 'fruits', 35),
-- Vegetables
('Tomatoes', 'vegetables', 40),
('Lettuce', 'vegetables', 41),
('Onions', 'vegetables', 42),
('Potatoes', 'vegetables', 43),
('Carrots', 'vegetables', 44),
('Celery', 'vegetables', 45),
('Peppers', 'vegetables', 46),
('Cucumbers', 'vegetables', 47),
('Broccoli', 'vegetables', 48),
('Corn', 'vegetables', 49),
-- Condiments & Spreads
('Peanut Butter', 'condiments', 50),
('Jelly', 'condiments', 51),
('Ketchup', 'condiments', 52),
('Mustard', 'condiments', 53),
('Mayonnaise', 'condiments', 54),
('Ranch', 'condiments', 55),
('Salsa', 'condiments', 56),
('Honey', 'condiments', 57),
-- Pantry Staples
('Salt', 'pantry', 60),
('Pepper', 'pantry', 61),
('Sugar', 'pantry', 62),
('Flour', 'pantry', 63),
('Olive Oil', 'pantry', 64),
('Vegetable Oil', 'pantry', 65),
('Canned Beans', 'pantry', 66),
('Canned Soup', 'pantry', 67);

-- Create storage bucket for recipe images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recipe images
CREATE POLICY "Anyone can view recipe images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Admins can upload recipe images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update recipe images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipe-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete recipe images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-images' AND has_admin_access(auth.uid()));