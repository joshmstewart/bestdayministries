-- Create newsletter email queue table for reliable large-volume sending
CREATE TABLE public.newsletter_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  subscriber_id UUID,
  personalized_html TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  resend_email_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT newsletter_email_queue_campaign_email_unique UNIQUE (campaign_id, recipient_email)
);

-- Index for efficient queue processing (get pending emails in order)
CREATE INDEX idx_newsletter_email_queue_status_created 
ON public.newsletter_email_queue (status, created_at) 
WHERE status = 'pending';

-- Index for campaign progress lookups
CREATE INDEX idx_newsletter_email_queue_campaign_status 
ON public.newsletter_email_queue (campaign_id, status);

-- Enable RLS
ALTER TABLE public.newsletter_email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage the queue
CREATE POLICY "Admins can manage newsletter queue" 
ON public.newsletter_email_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Add column to newsletter_campaigns to track queue status
ALTER TABLE public.newsletter_campaigns 
ADD COLUMN IF NOT EXISTS queued_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON TABLE public.newsletter_email_queue IS 'Queue for reliable newsletter sending with rate limiting. Processed by cron job every minute.';

-- Enable realtime for queue progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_email_queue;