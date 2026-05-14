SELECT cron.unschedule('retry-vendor-transfers-hourly');

SELECT cron.schedule(
  'retry-vendor-transfers-6hourly',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/retry-vendor-transfers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idmlqYXdtamt5Y3l3ZWlvZ2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDQzMzQsImV4cCI6MjA3NDgyMDMzNH0.EObXDkA1xo4bTzYwgHAQ1m1M6IWpHwFmeSvB4RE2NO8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);