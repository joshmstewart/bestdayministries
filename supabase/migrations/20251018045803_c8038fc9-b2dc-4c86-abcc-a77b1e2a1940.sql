-- Drop the old constraint that only allows one card per user per day
ALTER TABLE public.daily_scratch_cards 
DROP CONSTRAINT IF EXISTS daily_scratch_cards_user_id_date_key;

-- Add new constraint that allows one free card AND one bonus card per user per day
ALTER TABLE public.daily_scratch_cards 
ADD CONSTRAINT daily_scratch_cards_user_id_date_is_bonus_key 
UNIQUE (user_id, date, is_bonus_card);