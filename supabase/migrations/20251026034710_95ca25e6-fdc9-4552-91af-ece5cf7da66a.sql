-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily sticker collection updates at midnight MST (7 AM UTC)
SELECT cron.schedule(
  'update-sticker-collections-daily',
  '0 7 * * *', -- 7 AM UTC = Midnight MST
  $$
  SELECT
    net.http_post(
        url:='https://nbvijawmjkycyweioglk.supabase.co/functions/v1/update-sticker-collections',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idmlqYXdtamt5Y3l3ZWlvZ2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDQzMzQsImV4cCI6MjA3NDgyMDMzNH0.EObXDkA1xo4bTzYwgHAQ1m1M6IWpHwFmeSvB4RE2NO8"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);