-- Create newsletter_emails_log table to track all newsletter sends
CREATE TABLE IF NOT EXISTS public.newsletter_emails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.campaign_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  resend_email_id TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_newsletter_emails_log_campaign_id ON public.newsletter_emails_log(campaign_id);
CREATE INDEX idx_newsletter_emails_log_template_id ON public.newsletter_emails_log(template_id);
CREATE INDEX idx_newsletter_emails_log_recipient_email ON public.newsletter_emails_log(recipient_email);
CREATE INDEX idx_newsletter_emails_log_recipient_user_id ON public.newsletter_emails_log(recipient_user_id);
CREATE INDEX idx_newsletter_emails_log_sent_at ON public.newsletter_emails_log(sent_at DESC);
CREATE INDEX idx_newsletter_emails_log_status ON public.newsletter_emails_log(status);

-- Enable RLS
ALTER TABLE public.newsletter_emails_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view newsletter email logs"
  ON public.newsletter_emails_log
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- System can insert email logs
CREATE POLICY "System can insert newsletter email logs"
  ON public.newsletter_emails_log
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.newsletter_emails_log IS 'Logs all newsletter emails sent including status and any errors';