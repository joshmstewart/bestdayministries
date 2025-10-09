-- Fix security definer view issue
-- The game_leaderboard view was missing explicit security settings
-- which defaults to SECURITY DEFINER behavior, bypassing RLS
-- We need to set it to SECURITY INVOKER to enforce RLS properly

-- Alter the view to use SECURITY INVOKER
ALTER VIEW public.game_leaderboard SET (security_invoker = true);

-- Verify all other views are also using SECURITY INVOKER
-- (These already have it set, but this ensures they stay that way)
ALTER VIEW public.app_settings_public SET (security_invoker = true);
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.bestie_funding_progress SET (security_invoker = true);
ALTER VIEW public.sponsor_bestie_funding_progress SET (security_invoker = true);
ALTER VIEW public.sponsor_bestie_funding_progress_by_mode SET (security_invoker = true);
ALTER VIEW public.sponsorship_year_end_summary SET (security_invoker = true);
ALTER VIEW public.vendor_earnings SET (security_invoker = true);