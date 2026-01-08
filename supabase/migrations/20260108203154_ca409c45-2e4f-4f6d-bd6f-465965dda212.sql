
-- Update coloring like notification to allow self-likes
CREATE OR REPLACE FUNCTION public.notify_on_coloring_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coloring_owner_id UUID;
  coloring_title TEXT;
  liker_name TEXT;
BEGIN
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  SELECT uc.user_id, cp.title INTO coloring_owner_id, coloring_title
  FROM user_colorings uc
  JOIN coloring_pages cp ON cp.id = uc.coloring_page_id
  WHERE uc.id = NEW.coloring_id;
  
  IF coloring_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      coloring_owner_id,
      'content_like',
      'Someone liked your coloring!',
      COALESCE(liker_name, 'Someone') || ' liked your coloring "' || COALESCE(coloring_title, 'Untitled') || '"',
      '/games/coloring-book?tab=gallery',
      jsonb_build_object('content_type', 'coloring', 'content_id', NEW.coloring_id, 'liker_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update drink like notification to allow self-likes
CREATE OR REPLACE FUNCTION public.notify_on_drink_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  drink_owner_id UUID;
  drink_name TEXT;
  liker_name TEXT;
BEGIN
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  SELECT creator_id, name INTO drink_owner_id, drink_name
  FROM custom_drinks
  WHERE id = NEW.drink_id;
  
  IF drink_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      drink_owner_id,
      'content_like',
      'Someone liked your drink!',
      COALESCE(liker_name, 'Someone') || ' liked your drink "' || COALESCE(drink_name, 'Untitled') || '"',
      '/games/drinks-creator?tab=community',
      jsonb_build_object('content_type', 'drink', 'content_id', NEW.drink_id, 'liker_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update recipe like notification to allow self-likes
CREATE OR REPLACE FUNCTION public.notify_on_recipe_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipe_owner_id UUID;
  recipe_title TEXT;
  liker_name TEXT;
BEGIN
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  SELECT creator_id, title INTO recipe_owner_id, recipe_title
  FROM public_recipes
  WHERE id = NEW.recipe_id;
  
  IF recipe_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipe_owner_id,
      'content_like',
      'Someone liked your recipe!',
      COALESCE(liker_name, 'Someone') || ' liked your recipe "' || COALESCE(recipe_title, 'Untitled') || '"',
      '/games/recipe-gallery?tab=community',
      jsonb_build_object('content_type', 'recipe', 'content_id', NEW.recipe_id, 'liker_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;
