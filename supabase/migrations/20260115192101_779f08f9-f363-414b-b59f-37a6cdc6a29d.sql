-- Re-schedule the cron job to run daily, but the edge function itself checks the date
-- The function only sends on the configured auto_send_month/day from settings
SELECT cron.schedule(
  'send-year-end-summaries-daily',
  '0 12 * * *',  -- Run at noon UTC every day
  $$
  SELECT net.http_post(
    'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-batch-year-end-summaries',
    '{"force": false}',
    '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key', true) || '"}'
  );
  $$
);