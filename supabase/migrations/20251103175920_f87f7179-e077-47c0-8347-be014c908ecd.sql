-- Create email_audit_log table for universal email audit trail
CREATE TABLE email_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email identification
  resend_email_id text,
  email_type text NOT NULL, -- 'receipt', 'contact_confirmation', 'contact_reply', 'admin_notification', 'year_end_summary', 'newsletter', 'notification', 'digest'
  
  -- Recipient info
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_name text,
  
  -- Sender info
  from_email text NOT NULL,
  from_name text,
  
  -- Email content
  subject text NOT NULL,
  html_content text, -- Full email HTML for audit trail
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  error_message text,
  
  -- Related records
  related_id uuid, -- sponsorship_id, submission_id, donation_id, campaign_id, etc.
  related_type text, -- 'sponsorship', 'contact_submission', 'donation', 'newsletter_campaign', etc.
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_email_audit_recipient ON email_audit_log(recipient_email);
CREATE INDEX idx_email_audit_status ON email_audit_log(status);
CREATE INDEX idx_email_audit_type ON email_audit_log(email_type);
CREATE INDEX idx_email_audit_related ON email_audit_log(related_id, related_type);
CREATE INDEX idx_email_audit_created ON email_audit_log(created_at DESC);
CREATE INDEX idx_email_audit_user ON email_audit_log(recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins/owners can view all logs
CREATE POLICY "Admins can view all email logs"
  ON email_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert logs"
  ON email_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can delete old logs if needed
CREATE POLICY "Admins can delete email logs"
  ON email_audit_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );