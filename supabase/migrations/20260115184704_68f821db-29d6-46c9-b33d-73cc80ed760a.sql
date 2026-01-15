-- Create a cron job to automatically sync donation history daily at 2 AM UTC
SELECT cron.schedule(
  'sync-donation-history-daily',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/sync-donation-history',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-schedule', 'true',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);