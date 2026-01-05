-- Add color customization columns to memory_match_packs
ALTER TABLE public.memory_match_packs 
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#F97316',
ADD COLUMN IF NOT EXISTS module_color TEXT DEFAULT '#FFFFFF';

-- Add comment for documentation
COMMENT ON COLUMN public.memory_match_packs.background_color IS 'Hex color for the outer glow/background area behind the game module';
COMMENT ON COLUMN public.memory_match_packs.module_color IS 'Hex color for the inner module/card that contains the game elements';