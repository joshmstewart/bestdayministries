-- Add card_ids column to chore_wheel_spins to store won sticker pack card IDs
ALTER TABLE public.chore_wheel_spins 
ADD COLUMN IF NOT EXISTS card_ids text[] DEFAULT NULL;