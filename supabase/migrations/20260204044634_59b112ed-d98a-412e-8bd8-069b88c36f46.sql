-- Add last_progress_at column to track when the queue was last processed
ALTER TABLE public.newsletter_campaigns 
ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMP WITH TIME ZONE;

-- Add a comment explaining the column
COMMENT ON COLUMN public.newsletter_campaigns.last_progress_at IS 'Timestamp of the last time processed_count or failed_count was updated. Used to detect stuck campaigns.';