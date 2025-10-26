-- Add is_featured column to sticker_collections
ALTER TABLE sticker_collections 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Add constraint to ensure only one featured collection at a time
CREATE UNIQUE INDEX idx_single_featured_collection 
ON sticker_collections (is_featured) 
WHERE is_featured = true AND is_active = true;

-- Update RLS policy to check date ranges for visibility
DROP POLICY IF EXISTS "Collections viewable by everyone" ON sticker_collections;
DROP POLICY IF EXISTS "Sticker collections viewable by authorized roles" ON sticker_collections;

CREATE POLICY "Collections viewable by authorized roles with date check"
ON sticker_collections FOR SELECT
USING (
  is_active = true 
  AND CURRENT_DATE >= start_date 
  AND (end_date IS NULL OR CURRENT_DATE <= end_date)
  AND (
    visible_to_roles IS NOT NULL 
    AND COALESCE(array_length(visible_to_roles, 1), 0) > 0 
    AND get_user_role(auth.uid()) = ANY(visible_to_roles)
  )
);

-- Create function to automatically activate collections on start_date
CREATE OR REPLACE FUNCTION activate_collections_on_start_date()
RETURNS void AS $$
BEGIN
  UPDATE sticker_collections
  SET is_active = true
  WHERE start_date <= CURRENT_DATE 
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deactivate collections after end_date
CREATE OR REPLACE FUNCTION deactivate_collections_after_end_date()
RETURNS void AS $$
BEGIN
  UPDATE sticker_collections
  SET is_active = false
  WHERE end_date IS NOT NULL 
    AND end_date < CURRENT_DATE
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;