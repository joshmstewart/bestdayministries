-- Add missing likes_count triggers for Cards, Challenge Art, Prayers, and Recipes
-- These will match the existing pattern used by Beats, Coloring, Drinks, Jokes, and Workouts

-- 1. Cards: update user_cards.likes_count
CREATE OR REPLACE FUNCTION public.update_card_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_cards SET likes_count = likes_count + 1 WHERE id = NEW.card_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_cards SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.card_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_card_likes_count_trigger ON card_likes;
CREATE TRIGGER update_card_likes_count_trigger
AFTER INSERT OR DELETE ON card_likes
FOR EACH ROW EXECUTE FUNCTION update_card_likes_count();

-- 2. Challenge Art: update chore_challenge_gallery.likes_count
CREATE OR REPLACE FUNCTION public.update_challenge_gallery_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chore_challenge_gallery SET likes_count = likes_count + 1 WHERE id = NEW.gallery_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chore_challenge_gallery SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.gallery_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_challenge_gallery_likes_count_trigger ON chore_challenge_gallery_likes;
CREATE TRIGGER update_challenge_gallery_likes_count_trigger
AFTER INSERT OR DELETE ON chore_challenge_gallery_likes
FOR EACH ROW EXECUTE FUNCTION update_challenge_gallery_likes_count();

-- 3. Prayers: update prayer_requests.likes_count
CREATE OR REPLACE FUNCTION public.update_prayer_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prayer_requests SET likes_count = likes_count + 1 WHERE id = NEW.prayer_request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prayer_requests SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.prayer_request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_prayer_likes_count_trigger ON prayer_request_likes;
CREATE TRIGGER update_prayer_likes_count_trigger
AFTER INSERT OR DELETE ON prayer_request_likes
FOR EACH ROW EXECUTE FUNCTION update_prayer_likes_count();

-- 4. Recipes: update public_recipes.likes_count
CREATE OR REPLACE FUNCTION public.update_recipe_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public_recipes SET likes_count = likes_count + 1 WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public_recipes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_recipe_likes_count_trigger ON public_recipe_likes;
CREATE TRIGGER update_recipe_likes_count_trigger
AFTER INSERT OR DELETE ON public_recipe_likes
FOR EACH ROW EXECUTE FUNCTION update_recipe_likes_count();