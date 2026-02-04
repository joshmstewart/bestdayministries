-- Create a view for per-subscriber engagement summary
CREATE OR REPLACE VIEW public.newsletter_subscriber_engagement AS
SELECT 
  COALESCE(na.subscriber_id::text, na.email) as subscriber_identifier,
  na.email,
  ns.id as subscriber_id,
  ns.user_id,
  p.display_name as subscriber_name,
  COUNT(DISTINCT na.campaign_id) FILTER (WHERE na.event_type = 'sent') as campaigns_received,
  COUNT(*) FILTER (WHERE na.event_type = 'delivered') as total_delivered,
  COUNT(*) FILTER (WHERE na.event_type = 'opened') as total_opens,
  COUNT(*) FILTER (WHERE na.event_type = 'clicked') as total_clicks,
  COUNT(*) FILTER (WHERE na.event_type = 'bounced') as total_bounced,
  MAX(na.created_at) FILTER (WHERE na.event_type = 'opened') as last_opened_at,
  MAX(na.created_at) FILTER (WHERE na.event_type = 'clicked') as last_clicked_at,
  ROUND(
    (COUNT(*) FILTER (WHERE na.event_type = 'opened')::decimal / 
     NULLIF(COUNT(*) FILTER (WHERE na.event_type = 'delivered'), 0) * 100), 1
  ) as open_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE na.event_type = 'clicked')::decimal / 
     NULLIF(COUNT(*) FILTER (WHERE na.event_type = 'delivered'), 0) * 100), 1
  ) as click_rate
FROM public.newsletter_analytics na
LEFT JOIN public.newsletter_subscribers ns ON ns.id = na.subscriber_id OR ns.email = na.email
LEFT JOIN public.profiles p ON p.id = ns.user_id
GROUP BY COALESCE(na.subscriber_id::text, na.email), na.email, ns.id, ns.user_id, p.display_name;

-- Create a view for email client statistics  
CREATE OR REPLACE VIEW public.newsletter_email_client_stats AS
SELECT 
  na.campaign_id,
  nc.title as campaign_title,
  na.email_client,
  na.device_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE na.event_type = 'opened') as opens,
  COUNT(*) FILTER (WHERE na.event_type = 'clicked') as clicks,
  COUNT(*) FILTER (WHERE na.layout_fallback_used = true) as fallback_used_count
FROM public.newsletter_analytics na
JOIN public.newsletter_campaigns nc ON nc.id = na.campaign_id
WHERE na.email_client IS NOT NULL
GROUP BY na.campaign_id, nc.title, na.email_client, na.device_type;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.newsletter_subscriber_engagement TO authenticated;
GRANT SELECT ON public.newsletter_email_client_stats TO authenticated;