-- Clean up: Drop the orphaned duplicate function that's not attached to any trigger
DROP FUNCTION IF EXISTS public.notify_joke_like();

-- The active trigger uses notify_on_joke_like which we already fixed in the previous migration