-- Add card_back_url column to memory_match_packs
ALTER TABLE public.memory_match_packs
ADD COLUMN card_back_url TEXT;