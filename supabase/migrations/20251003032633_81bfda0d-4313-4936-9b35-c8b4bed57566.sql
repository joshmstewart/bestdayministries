-- Add is_active column to events table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;