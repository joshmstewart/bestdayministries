-- Fix daily_scratch_cards constraints

-- Create partial unique index for free daily cards (one per user per day where is_bonus_card = false)
CREATE UNIQUE INDEX IF NOT EXISTS daily_scratch_cards_user_date_free_unique 
ON public.daily_scratch_cards (user_id, date) 
WHERE (is_bonus_card = false);

-- Add unique constraint for bonus cards (one per purchase_number per user per day)
-- First check if it exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_scratch_cards_user_date_bonus_purchase_unique'
  ) THEN
    ALTER TABLE public.daily_scratch_cards 
    ADD CONSTRAINT daily_scratch_cards_user_date_bonus_purchase_unique 
    UNIQUE (user_id, date, is_bonus_card, purchase_number);
  END IF;
END $$;

-- Update the generate function to work with the new schema
CREATE OR REPLACE FUNCTION public.generate_daily_scratch_card(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  active_collection_id UUID;
  card_id UUID;
  today DATE;
BEGIN
  today := CURRENT_DATE;
  
  -- Get active collection
  SELECT id INTO active_collection_id
  FROM sticker_collections
  WHERE is_active = true
    AND start_date <= today
    AND (end_date IS NULL OR end_date >= today)
  ORDER BY display_order
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
$function$;