
-- Fix generate_daily_scratch_card to use MST (UTC-7) instead of UTC
CREATE OR REPLACE FUNCTION generate_daily_scratch_card(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_collection_id UUID;
  card_id UUID;
  today_mst DATE;
  tomorrow_mst_as_utc TIMESTAMPTZ;
BEGIN
  -- Calculate today's date in MST (UTC-7)
  today_mst := (NOW() AT TIME ZONE 'America/Denver')::DATE;
  
  -- Calculate tomorrow midnight MST expressed in UTC for expires_at
  tomorrow_mst_as_utc := ((today_mst + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'America/Denver');
  
  -- Get active collection - PRIORITIZE FEATURED COLLECTION
  SELECT id INTO active_collection_id
  FROM sticker_collections
  WHERE is_active = true
    AND (start_date IS NULL OR start_date <= today_mst)
    AND (end_date IS NULL OR end_date >= today_mst)
  ORDER BY is_featured DESC, display_order ASC
  LIMIT 1;
  
  -- If no active collection, return null
  IF active_collection_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to get existing free card first (using MST date)
  SELECT id INTO card_id
  FROM daily_scratch_cards
  WHERE user_id = _user_id
    AND date = today_mst
    AND is_bonus_card = false;
  
  -- If no card exists, create one
  IF card_id IS NULL THEN
    INSERT INTO daily_scratch_cards (user_id, date, collection_id, is_bonus_card, purchase_number, expires_at)
    VALUES (
      _user_id,
      today_mst,
      active_collection_id,
      false,
      1,
      tomorrow_mst_as_utc
    )
    RETURNING id INTO card_id;
  END IF;
  
  RETURN card_id;
END;
$$;

-- Reset everyone's daily scratch cards for today (both UTC and MST dates to catch all)
DELETE FROM daily_scratch_cards 
WHERE date >= CURRENT_DATE - INTERVAL '1 day'
  AND date <= CURRENT_DATE + INTERVAL '1 day'
  AND is_bonus_card = false;
