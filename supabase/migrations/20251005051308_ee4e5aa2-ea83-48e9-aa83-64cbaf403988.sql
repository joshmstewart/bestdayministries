-- Add is_read column to sponsor_messages table
ALTER TABLE public.sponsor_messages
ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster unread message queries
CREATE INDEX idx_sponsor_messages_read_status 
ON public.sponsor_messages(bestie_id, status, is_read);