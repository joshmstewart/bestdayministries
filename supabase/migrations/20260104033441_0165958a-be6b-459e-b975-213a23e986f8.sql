-- Create table for user's saved/favorited recipes (personal cookbook)
CREATE TABLE public.saved_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  steps TEXT[] NOT NULL DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  image_url TEXT,
  times_made INTEGER NOT NULL DEFAULT 0,
  last_made_at TIMESTAMP WITH TIME ZONE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  source_recipe_id UUID, -- Reference to public recipe if added from gallery
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for publicly shared recipes (gallery)
CREATE TABLE public.public_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  steps TEXT[] NOT NULL DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recipe likes
CREATE TABLE public.public_recipe_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.public_recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_recipe_likes ENABLE ROW LEVEL SECURITY;

-- Saved recipes policies (users can only access their own)
CREATE POLICY "Users can view their own saved recipes"
ON public.saved_recipes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved recipes"
ON public.saved_recipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved recipes"
ON public.saved_recipes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved recipes"
ON public.saved_recipes FOR DELETE
USING (auth.uid() = user_id);

-- Public recipes policies
CREATE POLICY "Anyone can view active public recipes"
ON public.public_recipes FOR SELECT
USING (is_active = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create public recipes"
ON public.public_recipes FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own public recipes"
ON public.public_recipes FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own public recipes"
ON public.public_recipes FOR DELETE
USING (auth.uid() = creator_id);

-- Like policies
CREATE POLICY "Anyone can view likes"
ON public.public_recipe_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like recipes"
ON public.public_recipe_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike recipes"
ON public.public_recipe_likes FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_saved_recipes_updated_at
BEFORE UPDATE ON public.saved_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_public_recipes_updated_at
BEFORE UPDATE ON public.public_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();