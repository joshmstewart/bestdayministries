
-- Backfill missing preview stickers for all collections
UPDATE sticker_collections sc
SET preview_sticker_id = (
  SELECT s.id
  FROM stickers s
  WHERE s.collection_id = sc.id
    AND s.is_active = true
  ORDER BY s.created_at
  LIMIT 1
)
WHERE sc.preview_sticker_id IS NULL
  AND EXISTS (
    SELECT 1 FROM stickers s2 
    WHERE s2.collection_id = sc.id 
      AND s2.is_active = true
  );

-- Create function to auto-set preview sticker when first sticker is added
CREATE OR REPLACE FUNCTION auto_set_preview_sticker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If the collection doesn't have a preview sticker yet, set this one as the preview
  UPDATE sticker_collections
  SET preview_sticker_id = NEW.id
  WHERE id = NEW.collection_id
    AND preview_sticker_id IS NULL
    AND NEW.is_active = true;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set preview sticker on insert
DROP TRIGGER IF EXISTS set_preview_sticker_on_insert ON stickers;
CREATE TRIGGER set_preview_sticker_on_insert
  AFTER INSERT ON stickers
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_preview_sticker();
