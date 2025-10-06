-- Fix Security Definer Views: Convert to SECURITY INVOKER
-- This makes views respect the querying user's RLS policies instead of the creator's

ALTER VIEW vendor_earnings SET (security_invoker = true);
ALTER VIEW sponsor_bestie_funding_progress SET (security_invoker = true);
ALTER VIEW sponsorship_year_end_summary SET (security_invoker = true);
ALTER VIEW sponsor_bestie_funding_progress_by_mode SET (security_invoker = true);