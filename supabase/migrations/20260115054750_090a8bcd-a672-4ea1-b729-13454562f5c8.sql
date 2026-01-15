-- Add instrument_order column to preserve sound order when loading beats
ALTER TABLE public.beat_pad_creations 
ADD COLUMN IF NOT EXISTS instrument_order text[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.beat_pad_creations.instrument_order IS 'Array of sound IDs in display order to preserve instrument arrangement when loading';