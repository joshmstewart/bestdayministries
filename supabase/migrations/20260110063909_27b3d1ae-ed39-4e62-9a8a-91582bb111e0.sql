-- Fix SECURITY DEFINER view issue by setting security_invoker=true on page_visit_stats view
-- This ensures the view enforces RLS policies of the querying user rather than the view creator

-- Drop and recreate the view with security_invoker=true
DROP VIEW IF EXISTS public.page_visit_stats;

CREATE VIEW public.page_visit_stats 
WITH (security_invoker = true)
AS
SELECT 
  page_url,
  date(visited_at) AS visit_date,
  count(*) AS visit_count,
  count(DISTINCT user_id) AS unique_users,
  count(DISTINCT session_id) AS unique_sessions
FROM page_visits
GROUP BY page_url, (date(visited_at))
ORDER BY (date(visited_at)) DESC;