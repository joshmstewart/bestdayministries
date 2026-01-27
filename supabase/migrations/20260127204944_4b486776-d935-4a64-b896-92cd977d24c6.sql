-- Add card_text_color column to memory_match_packs
ALTER TABLE public.memory_match_packs 
ADD COLUMN card_text_color text NOT NULL DEFAULT 'black';

-- Set European Icons pack to white, all others stay black (default)
UPDATE public.memory_match_packs 
SET card_text_color = 'white' 
WHERE name ILIKE '%european%';