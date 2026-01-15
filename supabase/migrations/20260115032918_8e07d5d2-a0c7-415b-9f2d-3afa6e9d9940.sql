-- Add card_design_id to user_cards (like user_colorings has coloring_page_id)
ALTER TABLE public.user_cards 
ADD COLUMN IF NOT EXISTS card_design_id UUID REFERENCES public.card_designs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_cards_design_id ON public.user_cards(card_design_id);

-- Create index for user + design combo (for upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cards_user_design ON public.user_cards(user_id, card_design_id) WHERE card_design_id IS NOT NULL;