-- Create newsletter subscriber status enum
CREATE TYPE newsletter_status AS ENUM ('active', 'unsubscribed', 'bounced', 'complained');

-- Create newsletter campaign status enum
CREATE TYPE newsletter_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- Create newsletter event type enum
CREATE TYPE newsletter_event_type AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained');

-- Create newsletter_subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status newsletter_status NOT NULL DEFAULT 'active',
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  timezone TEXT,
  ip_address TEXT,
  source TEXT NOT NULL DEFAULT 'website_signup',
  metadata JSONB DEFAULT '{}'::jsonb,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsletter_campaigns table
CREATE TABLE public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL,
  status newsletter_campaign_status NOT NULL DEFAULT 'draft',
  segment_filter JSONB,
  sent_to_count INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsletter_analytics table
CREATE TABLE public.newsletter_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type newsletter_event_type NOT NULL,
  clicked_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timezone TEXT,
  resend_event_id TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsletter_links table
CREATE TABLE public.newsletter_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_newsletter_analytics_campaign ON public.newsletter_analytics(campaign_id);
CREATE INDEX idx_newsletter_analytics_subscriber ON public.newsletter_analytics(subscriber_id);
CREATE INDEX idx_newsletter_analytics_event_type ON public.newsletter_analytics(event_type);
CREATE INDEX idx_newsletter_analytics_created_at ON public.newsletter_analytics(created_at);
CREATE INDEX idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_user_id ON public.newsletter_subscribers(user_id);
CREATE INDEX idx_newsletter_campaigns_status ON public.newsletter_campaigns(status);
CREATE INDEX idx_newsletter_campaigns_created_by ON public.newsletter_campaigns(created_by);

-- Enable RLS on all tables
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscription"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

CREATE POLICY "Users can update their own subscription"
  ON public.newsletter_subscribers
  FOR UPDATE
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete subscriptions"
  ON public.newsletter_subscribers
  FOR DELETE
  USING (has_admin_access(auth.uid()));

-- RLS Policies for newsletter_campaigns
CREATE POLICY "Admins can manage campaigns"
  ON public.newsletter_campaigns
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for newsletter_analytics
CREATE POLICY "Admins can view analytics"
  ON public.newsletter_analytics
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Service role can insert analytics"
  ON public.newsletter_analytics
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for newsletter_links
CREATE POLICY "Admins can manage links"
  ON public.newsletter_links
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Anyone can view links for tracking"
  ON public.newsletter_links
  FOR SELECT
  TO public
  USING (true);

-- Create trigger for updated_at on campaigns
CREATE TRIGGER update_newsletter_campaigns_updated_at
  BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();