-- Add GA date and featured scheduling fields to sticker_collections
ALTER TABLE sticker_collections
ADD COLUMN ga_date date,
ADD COLUMN featured_start_date date;

COMMENT ON COLUMN sticker_collections.ga_date IS 'Date when collection becomes available to all roles (General Availability)';
COMMENT ON COLUMN sticker_collections.featured_start_date IS 'Date when collection automatically becomes featured';

-- Function to promote collections to GA (expand visible_to_roles to all roles)
CREATE OR REPLACE FUNCTION promote_collections_to_ga()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update collections that reached their GA date
  UPDATE sticker_collections
  SET visible_to_roles = ARRAY['supporter'::user_role, 'bestie'::user_role, 'caregiver'::user_role, 'admin'::user_role, 'owner'::user_role]
  WHERE ga_date IS NOT NULL
    AND ga_date <= CURRENT_DATE
    AND (visible_to_roles IS NULL 
         OR visible_to_roles != ARRAY['supporter'::user_role, 'bestie'::user_role, 'caregiver'::user_role, 'admin'::user_role, 'owner'::user_role]);
END;
$$;

-- Function to update featured collections based on scheduled dates
CREATE OR REPLACE FUNCTION update_featured_collections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- First, unfeatured any collections whose featured period has ended
  -- (if they have a featured_start_date in the past and end_date has passed)
  UPDATE sticker_collections
  SET is_featured = false
  WHERE is_featured = true
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;

  -- Then, feature collections that should be featured now
  -- Unfeatured all current featured collections first
  UPDATE sticker_collections
  SET is_featured = false
  WHERE is_featured = true
    AND id NOT IN (
      SELECT id FROM sticker_collections
      WHERE featured_start_date IS NOT NULL
        AND featured_start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      ORDER BY featured_start_date DESC, display_order ASC
      LIMIT 1
    );

  -- Feature the collection that should be featured now
  -- (most recent featured_start_date that has passed)
  UPDATE sticker_collections
  SET is_featured = true
  WHERE id IN (
    SELECT id FROM sticker_collections
    WHERE featured_start_date IS NOT NULL
      AND featured_start_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      AND is_active = true
    ORDER BY featured_start_date DESC, display_order ASC
    LIMIT 1
  );
END;
$$;