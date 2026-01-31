-- Add is_archived column to daily_fortunes table
ALTER TABLE public.daily_fortunes 
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_daily_fortunes_is_archived ON public.daily_fortunes(is_archived);