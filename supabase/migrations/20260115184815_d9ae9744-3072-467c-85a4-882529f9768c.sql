-- Remove the daily cron job and create an hourly one instead
SELECT cron.unschedule('sync-donation-history-daily');

SELECT cron.schedule(
  'sync-donation-history-hourly',
  '0 * * * *', -- Every hour at :00
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