-- Create cron job to check Printify order statuses every 15 minutes
SELECT cron.schedule(
  'check-printify-status-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/check-printify-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);