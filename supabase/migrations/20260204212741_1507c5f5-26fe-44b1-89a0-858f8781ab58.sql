-- Fix security definer views by making them use invoker security
ALTER VIEW public.newsletter_subscriber_engagement SET (security_invoker = on);
ALTER VIEW public.newsletter_email_client_stats SET (security_invoker = on);