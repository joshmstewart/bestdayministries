-- Create stripe_webhook_logs table for comprehensive webhook tracking
CREATE TABLE IF NOT EXISTS public.stripe_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stripe_mode TEXT NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  raw_event JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing' CHECK (processing_status IN ('processing', 'success', 'failed', 'skipped')),
  processing_steps JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  error_stack TEXT,
  customer_id TEXT,
  customer_email TEXT,
  related_record_type TEXT,
  related_record_id UUID,
  http_status_code INTEGER,
  processing_duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookups by event ID
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.stripe_webhook_logs(event_id);

-- Index for filtering by status and date
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_date ON public.stripe_webhook_logs(processing_status, created_at DESC);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.stripe_webhook_logs(event_type);

-- Index for filtering by customer
CREATE INDEX IF NOT EXISTS idx_webhook_logs_customer_email ON public.stripe_webhook_logs(customer_email);

-- Enable RLS
ALTER TABLE public.stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all webhook logs
CREATE POLICY "Admins can view all webhook logs"
  ON public.stripe_webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Create function to notify admins of webhook failures
CREATE OR REPLACE FUNCTION public.notify_admins_of_webhook_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only notify on failures
  IF NEW.processing_status = 'failed' THEN
    -- Notify all admins/owners about webhook failures
    FOR admin_record IN
      SELECT user_id
      FROM user_roles
      WHERE role IN ('admin', 'owner')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        admin_record.user_id,
        'webhook_failure',
        'Stripe Webhook Failed',
        'Event ' || NEW.event_type || ' failed: ' || COALESCE(NEW.error_message, 'Unknown error'),
        '/admin?tab=donations&subtab=webhook-logs',
        jsonb_build_object(
          'webhook_log_id', NEW.id,
          'event_id', NEW.event_id,
          'event_type', NEW.event_type,
          'error_message', NEW.error_message
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for webhook failure notifications
DROP TRIGGER IF EXISTS notify_on_webhook_failure ON public.stripe_webhook_logs;
CREATE TRIGGER notify_on_webhook_failure
  AFTER INSERT OR UPDATE ON public.stripe_webhook_logs
  FOR EACH ROW
  WHEN (NEW.processing_status = 'failed')
  EXECUTE FUNCTION notify_admins_of_webhook_failure();