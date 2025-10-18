-- Add is_bonus_card column to track purchased second cards
ALTER TABLE daily_scratch_cards
ADD COLUMN is_bonus_card BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN daily_scratch_cards.is_bonus_card IS 'True if this card was purchased with coins, false if it is the free daily card';

-- Create index for efficient queries
CREATE INDEX idx_daily_scratch_cards_user_date_bonus ON daily_scratch_cards(user_id, date, is_bonus_card);