-- Add theme column to daily_fortunes table for tracking topic coverage
ALTER TABLE public.daily_fortunes 
ADD COLUMN IF NOT EXISTS theme TEXT;

-- Add index for efficient theme queries
CREATE INDEX IF NOT EXISTS idx_daily_fortunes_theme ON public.daily_fortunes(theme);

-- Add comment for documentation
COMMENT ON COLUMN public.daily_fortunes.theme IS 'Topic/theme category for balanced content rotation (e.g., time_preciousness, simplicity_focus)';