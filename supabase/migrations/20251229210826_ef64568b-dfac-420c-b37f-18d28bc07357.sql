
-- Fix generate_daily_scratch_card to prioritize featured collection
CREATE OR REPLACE FUNCTION generate_daily_scratch_card(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_collection_id UUID;
  card_id UUID;
  today DATE;
BEGIN
  today := CURRENT_DATE;
  
  -- Get active collection - PRIORITIZE FEATURED COLLECTION
  SELECT id INTO active_collection_id
  FROM sticker_collections
  WHERE is_active = true
    AND (start_date IS NULL OR start_date <= today)
    AND (end_date IS NULL OR end_date >= today)
  ORDER BY is_featured DESC, display_order ASC
  LIMIT 1;
  
  -- If no active collection, return null
  IF active_collection_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to get existing free card first
  SELECT id INTO card_id
  FROM daily_scratch_cards
  WHERE user_id = _user_id
    AND date = today
    AND is_bonus_card = false;
  
  -- If no card exists, create one
  IF card_id IS NULL THEN
    INSERT INTO daily_scratch_cards (user_id, date, collection_id, is_bonus_card, purchase_number, expires_at)
    VALUES (
      _user_id,
      today,
      active_collection_id,
      false,
      1,
      (today + INTERVAL '1 day')::timestamp with time zone
    )
    RETURNING id INTO card_id;
  END IF;
  
  RETURN card_id;
END;
$$;
