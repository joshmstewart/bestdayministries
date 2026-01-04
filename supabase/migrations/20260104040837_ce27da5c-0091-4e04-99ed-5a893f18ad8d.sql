-- Create shopping list table for recipe ingredients/tools
CREATE TABLE public.recipe_shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'tool')),
  emoji TEXT,
  reason TEXT,
  estimated_cost TEXT,
  is_purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add dismissed tips to saved_shopping_tips
ALTER TABLE public.saved_shopping_tips 
ADD COLUMN IF NOT EXISTS dismissed_ingredients TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dismissed_tools TEXT[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.recipe_shopping_list ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own shopping list" 
ON public.recipe_shopping_list FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create shopping list items" 
ON public.recipe_shopping_list FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items" 
ON public.recipe_shopping_list FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" 
ON public.recipe_shopping_list FOR DELETE 
USING (auth.uid() = user_id);