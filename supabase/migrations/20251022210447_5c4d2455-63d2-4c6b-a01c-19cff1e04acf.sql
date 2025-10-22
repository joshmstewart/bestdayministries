-- Fix donations status constraint to match what the code actually uses
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_status_check;

-- Add correct constraint with all statuses used by the application
ALTER TABLE public.donations ADD CONSTRAINT donations_status_check 
  CHECK (status IN ('pending', 'completed', 'active', 'cancelled', 'paused'));