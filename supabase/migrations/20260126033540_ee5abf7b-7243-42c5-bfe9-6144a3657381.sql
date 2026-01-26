-- Fix purchase_number column to support timestamp values
ALTER TABLE daily_scratch_cards 
ALTER COLUMN purchase_number TYPE BIGINT;