-- Create a trigger to automatically update likes_count when likes are added/removed
CREATE OR REPLACE FUNCTION update_coloring_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_colorings SET likes_count = likes_count + 1 WHERE id = NEW.coloring_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_colorings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.coloring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_coloring_likes_count_trigger ON coloring_likes;

CREATE TRIGGER update_coloring_likes_count_trigger
AFTER INSERT OR DELETE ON coloring_likes
FOR EACH ROW EXECUTE FUNCTION update_coloring_likes_count();