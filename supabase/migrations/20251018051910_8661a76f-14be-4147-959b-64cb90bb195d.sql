-- Add purchase_number column to allow multiple bonus cards per day
ALTER TABLE daily_scratch_cards 
ADD COLUMN purchase_number INTEGER NOT NULL DEFAULT 1;

-- Drop the old unique constraint that prevents multiple bonus cards
ALTER TABLE daily_scratch_cards 
DROP CONSTRAINT IF EXISTS daily_scratch_cards_user_id_date_is_bonus_key;

-- Add new unique constraint that allows multiple bonus cards with different purchase numbers
ALTER TABLE daily_scratch_cards 
ADD CONSTRAINT daily_scratch_cards_user_id_date_bonus_purchase_key 
UNIQUE (user_id, date, is_bonus_card, purchase_number);

-- Add comment explaining the purchase_number column
COMMENT ON COLUMN daily_scratch_cards.purchase_number IS 'For daily cards this is always 1. For bonus cards, this increments with each purchase (1, 2, 3, etc.) to allow multiple bonus cards per day';