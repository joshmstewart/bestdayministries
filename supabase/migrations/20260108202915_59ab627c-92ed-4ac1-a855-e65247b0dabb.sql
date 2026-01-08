-- Function to notify when someone likes a coloring page
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
  -- Get the liker's name
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get the coloring owner and title
  SELECT uc.user_id, cp.title INTO coloring_owner_id, coloring_title
  FROM user_colorings uc
  JOIN coloring_pages cp ON cp.id = uc.coloring_page_id
  WHERE uc.id = NEW.coloring_id;
  
  -- Don't notify if user liked their own coloring
  IF coloring_owner_id IS NOT NULL AND coloring_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      coloring_owner_id,
      'content_like',
      'Someone liked your coloring!',
      COALESCE(liker_name, 'Someone') || ' liked your coloring "' || COALESCE(coloring_title, 'Untitled') || '"',
      '/games/coloring-book?tab=gallery',
      jsonb_build_object(
        'content_type', 'coloring',
        'content_id', NEW.coloring_id,
        'liker_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for coloring likes
DROP TRIGGER IF EXISTS on_coloring_like ON coloring_likes;
CREATE TRIGGER on_coloring_like
  AFTER INSERT ON coloring_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_coloring_like();

-- Function to notify when someone likes a custom drink
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
  -- Get the liker's name
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get the drink owner and name
  SELECT creator_id, name INTO drink_owner_id, drink_name
  FROM custom_drinks
  WHERE id = NEW.drink_id;
  
  -- Don't notify if user liked their own drink
  IF drink_owner_id IS NOT NULL AND drink_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      drink_owner_id,
      'content_like',
      'Someone liked your drink!',
      COALESCE(liker_name, 'Someone') || ' liked your drink "' || COALESCE(drink_name, 'Untitled') || '"',
      '/games/drinks-creator?tab=community',
      jsonb_build_object(
        'content_type', 'drink',
        'content_id', NEW.drink_id,
        'liker_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for drink likes
DROP TRIGGER IF EXISTS on_drink_like ON custom_drink_likes;
CREATE TRIGGER on_drink_like
  AFTER INSERT ON custom_drink_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_drink_like();

-- Function to notify when someone likes a public recipe
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
  -- Get the liker's name
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get the recipe owner and title
  SELECT creator_id, title INTO recipe_owner_id, recipe_title
  FROM public_recipes
  WHERE id = NEW.recipe_id;
  
  -- Don't notify if user liked their own recipe
  IF recipe_owner_id IS NOT NULL AND recipe_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipe_owner_id,
      'content_like',
      'Someone liked your recipe!',
      COALESCE(liker_name, 'Someone') || ' liked your recipe "' || COALESCE(recipe_title, 'Untitled') || '"',
      '/games/recipe-gallery?tab=community',
      jsonb_build_object(
        'content_type', 'recipe',
        'content_id', NEW.recipe_id,
        'liker_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for recipe likes
DROP TRIGGER IF EXISTS on_recipe_like ON public_recipe_likes;
CREATE TRIGGER on_recipe_like
  AFTER INSERT ON public_recipe_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_recipe_like();