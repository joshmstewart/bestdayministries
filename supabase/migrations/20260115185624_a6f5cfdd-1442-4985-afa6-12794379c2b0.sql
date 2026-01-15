-- Create cron job to run year-end summaries daily at 14:00 UTC
SELECT cron.schedule(
  'send-year-end-summaries-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-batch-year-end-summaries',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);