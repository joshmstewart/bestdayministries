-- Keep public_recipes.saves_count accurate based on saved_recipes

-- 1) Backfill counts from existing saved_recipes rows
WITH counts AS (
  SELECT source_recipe_id, COUNT(*)::int AS cnt
  FROM public.saved_recipes
  WHERE source_recipe_id IS NOT NULL
  GROUP BY source_recipe_id
)
UPDATE public.public_recipes pr
SET saves_count = COALESCE(c.cnt, 0)
FROM counts c
WHERE pr.id = c.source_recipe_id;

UPDATE public.public_recipes pr
SET saves_count = 0
WHERE pr.id NOT IN (
  SELECT DISTINCT source_recipe_id
  FROM public.saved_recipes
  WHERE source_recipe_id IS NOT NULL
);

-- 2) Increment/decrement automatically via triggers
DROP TRIGGER IF EXISTS saved_recipes_increment_public_recipe_saves ON public.saved_recipes;
DROP TRIGGER IF EXISTS saved_recipes_decrement_public_recipe_saves ON public.saved_recipes;

DROP FUNCTION IF EXISTS public.increment_public_recipe_saves_count();
DROP FUNCTION IF EXISTS public.decrement_public_recipe_saves_count();

CREATE OR REPLACE FUNCTION public.increment_public_recipe_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_recipe_id IS NOT NULL THEN
    UPDATE public.public_recipes
    SET saves_count = COALESCE(saves_count, 0) + 1
    WHERE id = NEW.source_recipe_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_public_recipe_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.source_recipe_id IS NOT NULL THEN
    UPDATE public.public_recipes
    SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0)
    WHERE id = OLD.source_recipe_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER saved_recipes_increment_public_recipe_saves
AFTER INSERT ON public.saved_recipes
FOR EACH ROW
EXECUTE FUNCTION public.increment_public_recipe_saves_count();

CREATE TRIGGER saved_recipes_decrement_public_recipe_saves
AFTER DELETE ON public.saved_recipes
FOR EACH ROW
EXECUTE FUNCTION public.decrement_public_recipe_saves_count();
