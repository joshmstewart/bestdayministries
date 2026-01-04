-- Create table to store user's saved recipe ingredients
CREATE TABLE public.user_recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Users can only access their own saved ingredients
CREATE POLICY "Users can view their own saved ingredients"
ON public.user_recipe_ingredients
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved ingredients"
ON public.user_recipe_ingredients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved ingredients"
ON public.user_recipe_ingredients
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to update timestamp
CREATE TRIGGER update_user_recipe_ingredients_updated_at
BEFORE UPDATE ON public.user_recipe_ingredients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();