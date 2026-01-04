-- Backfill saved_recipes.source_recipe_id for legacy rows (best-effort by title match)
WITH matches AS (
  SELECT
    sr.id AS saved_id,
    (
      SELECT pr.id
      FROM public.public_recipes pr
      WHERE lower(pr.title) = lower(sr.title)
      ORDER BY pr.created_at DESC
      LIMIT 1
    ) AS public_id
  FROM public.saved_recipes sr
  WHERE sr.source_recipe_id IS NULL
)
UPDATE public.saved_recipes sr
SET source_recipe_id = m.public_id
FROM matches m
WHERE sr.id = m.saved_id
  AND m.public_id IS NOT NULL;

-- Recompute public_recipes.saves_count from saved_recipes
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

-- Keep counts correct if a saved_recipes row is edited later
DROP TRIGGER IF EXISTS saved_recipes_update_public_recipe_saves ON public.saved_recipes;
DROP FUNCTION IF EXISTS public.sync_public_recipe_saves_on_saved_recipes_update();

CREATE OR REPLACE FUNCTION public.sync_public_recipe_saves_on_saved_recipes_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.source_recipe_id IS DISTINCT FROM NEW.source_recipe_id THEN
    IF OLD.source_recipe_id IS NOT NULL THEN
      UPDATE public.public_recipes
      SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0)
      WHERE id = OLD.source_recipe_id;
    END IF;

    IF NEW.source_recipe_id IS NOT NULL THEN
      UPDATE public.public_recipes
      SET saves_count = COALESCE(saves_count, 0) + 1
      WHERE id = NEW.source_recipe_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER saved_recipes_update_public_recipe_saves
AFTER UPDATE OF source_recipe_id ON public.saved_recipes
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_recipe_saves_on_saved_recipes_update();
