-- Create table to store available kitchen tools/equipment
CREATE TABLE public.recipe_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store user's available tools
CREATE TABLE public.user_recipe_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tools TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.recipe_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipe_tools ENABLE ROW LEVEL SECURITY;

-- Recipe tools are public read
CREATE POLICY "Anyone can view active recipe tools"
ON public.recipe_tools FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage recipe tools"
ON public.recipe_tools FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- User tools policies
CREATE POLICY "Users can view their own tools"
ON public.user_recipe_tools FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tools"
ON public.user_recipe_tools FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tools"
ON public.user_recipe_tools FOR UPDATE
USING (auth.uid() = user_id);

-- Seed common kitchen tools
INSERT INTO public.recipe_tools (name, category, icon, display_order) VALUES
-- Appliances
('Oven', 'appliances', '🔥', 1),
('Stove/Cooktop', 'appliances', '🍳', 2),
('Microwave', 'appliances', '📡', 3),
('Toaster', 'appliances', '🍞', 4),
('Toaster Oven', 'appliances', '🔲', 5),
('Air Fryer', 'appliances', '🌀', 6),
('Blender', 'appliances', '🥤', 7),
('Food Processor', 'appliances', '⚙️', 8),
('Stand Mixer', 'appliances', '🎂', 9),
('Hand Mixer', 'appliances', '🥄', 10),
('Slow Cooker', 'appliances', '🍲', 11),
('Instant Pot', 'appliances', '⏱️', 12),
('Rice Cooker', 'appliances', '🍚', 13),
('Waffle Maker', 'appliances', '🧇', 14),
('Griddle', 'appliances', '🥞', 15),
-- Cookware
('Frying Pan', 'cookware', '🍳', 20),
('Saucepan', 'cookware', '🥘', 21),
('Large Pot', 'cookware', '🍲', 22),
('Baking Sheet', 'cookware', '📋', 23),
('Casserole Dish', 'cookware', '🥧', 24),
('Muffin Pan', 'cookware', '🧁', 25),
('Cake Pan', 'cookware', '🎂', 26),
('Loaf Pan', 'cookware', '🍞', 27),
('Pizza Pan', 'cookware', '🍕', 28),
('Wok', 'cookware', '🥡', 29),
('Dutch Oven', 'cookware', '🫕', 30),
('Grill Pan', 'cookware', '🔥', 31),
-- Utensils
('Spatula', 'utensils', '🥄', 40),
('Whisk', 'utensils', '🥚', 41),
('Tongs', 'utensils', '🦞', 42),
('Wooden Spoon', 'utensils', '🥄', 43),
('Ladle', 'utensils', '🥣', 44),
('Measuring Cups', 'utensils', '🥛', 45),
('Measuring Spoons', 'utensils', '🥄', 46),
('Mixing Bowls', 'utensils', '🥣', 47),
('Cutting Board', 'utensils', '🪵', 48),
('Kitchen Knife', 'utensils', '🔪', 49),
('Can Opener', 'utensils', '🥫', 50),
('Colander', 'utensils', '🕳️', 51),
('Peeler', 'utensils', '🥕', 52),
('Grater', 'utensils', '🧀', 53),
('Rolling Pin', 'utensils', '📏', 54);