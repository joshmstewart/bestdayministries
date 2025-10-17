-- Create campaign templates table for reusable email templates
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'welcome', 'signup_confirmation', 'subscription_success', 'event', 'product_launch', 'custom'
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_event TEXT, -- 'newsletter_signup', 'site_signup', 'subscription_created', 'event_published', 'product_published'
  auto_send BOOLEAN NOT NULL DEFAULT false,
  delay_minutes INTEGER DEFAULT 0, -- Delay before sending automated email
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automated campaign sends tracking table
CREATE TABLE IF NOT EXISTS public.automated_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.campaign_templates(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON public.campaign_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_trigger ON public.campaign_templates(trigger_event) WHERE auto_send = true;
CREATE INDEX IF NOT EXISTS idx_automated_sends_recipient ON public.automated_campaign_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_automated_sends_template ON public.automated_campaign_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_automated_sends_created ON public.automated_campaign_sends(created_at);

-- Enable RLS
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_campaign_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_templates
CREATE POLICY "Admins can manage campaign templates"
  ON public.campaign_templates
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Active templates viewable by admins"
  ON public.campaign_templates
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- RLS Policies for automated_campaign_sends
CREATE POLICY "Admins can view automated sends"
  ON public.automated_campaign_sends
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert automated sends"
  ON public.automated_campaign_sends
  FOR INSERT
  WITH CHECK (true);

-- Add source and campaign_template_id to newsletter_subscribers
ALTER TABLE public.newsletter_subscribers 
ADD COLUMN IF NOT EXISTS campaign_template_id UUID REFERENCES public.campaign_templates(id) ON DELETE SET NULL;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_campaign_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_templates_updated_at
  BEFORE UPDATE ON public.campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_template_updated_at();

-- Insert default templates
INSERT INTO public.campaign_templates (name, description, template_type, subject, content, trigger_event, auto_send, delay_minutes) VALUES
('Welcome to Our Newsletter', 'Sent when someone subscribes to the newsletter', 'welcome', 'Welcome to Best Day Ministries!', 
'<h1>Welcome to Our Community!</h1>
<p>Thank you for subscribing to our newsletter. We''re excited to have you join us!</p>
<p>You''ll receive monthly updates about:</p>
<ul>
<li>Upcoming events and activities</li>
<li>Inspiring stories from our community</li>
<li>Ways to get involved and make a difference</li>
</ul>
<p>We look forward to staying connected with you!</p>
<p>Blessings,<br>The Best Day Ministries Team</p>', 
'newsletter_signup', true, 5),

('Account Created', 'Sent when a new user creates an account', 'signup_confirmation', 'Welcome to Best Day Ministries!', 
'<h1>Your Account is Ready!</h1>
<p>Thank you for joining Best Day Ministries. Your account has been successfully created.</p>
<p>You can now:</p>
<ul>
<li>Connect with our community</li>
<li>Register for events</li>
<li>Share your story</li>
<li>Make a difference</li>
</ul>
<p>Get started by exploring our <a href="/community">Community page</a>!</p>
<p>Blessings,<br>The Best Day Ministries Team</p>', 
'site_signup', true, 2),

('Thank You for Your Sponsorship', 'Sent when someone starts a sponsorship', 'subscription_success', 'Thank You for Sponsoring a Bestie!', 
'<h1>Your Sponsorship is Making a Difference!</h1>
<p>Thank you for your generous heart and commitment to sponsor a Bestie. Your support directly impacts lives and creates opportunities for growth and connection.</p>
<p>You''ll receive:</p>
<ul>
<li>Monthly updates about your sponsored Bestie</li>
<li>Exclusive photos and stories</li>
<li>Tax receipts for your donations</li>
</ul>
<p>Thank you for being part of our mission!</p>
<p>With gratitude,<br>The Best Day Ministries Team</p>', 
'subscription_created', true, 10),

('Upcoming Event Announcement', 'Template for announcing new events', 'event', 'Join Us for [EVENT_NAME]!', 
'<h1>You''re Invited: [EVENT_NAME]</h1>
<p>We''re excited to invite you to join us for an upcoming event!</p>
<p><strong>When:</strong> [EVENT_DATE]<br>
<strong>Where:</strong> [EVENT_LOCATION]</p>
<p>[EVENT_DESCRIPTION]</p>
<p><a href="/community">Register now</a> to save your spot!</p>
<p>We hope to see you there!</p>
<p>Blessings,<br>The Best Day Ministries Team</p>', 
NULL, false, 0),

('New Product Launch', 'Template for announcing new products in the marketplace', 'product_launch', 'New in Our Marketplace: [PRODUCT_NAME]!', 
'<h1>Check Out Our Latest Product!</h1>
<p>We''re thrilled to announce a new addition to our marketplace created by our talented community members!</p>
<p><strong>[PRODUCT_NAME]</strong></p>
<p>[PRODUCT_DESCRIPTION]</p>
<p><a href="/marketplace">Visit our marketplace</a> to see this and other amazing handmade items.</p>
<p>Every purchase supports our community members and their creative talents!</p>
<p>Blessings,<br>The Best Day Ministries Team</p>', 
NULL, false, 0)
ON CONFLICT DO NOTHING;