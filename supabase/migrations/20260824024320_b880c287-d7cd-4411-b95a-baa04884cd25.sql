SELECT cron.alter_job(13, command := $cmd$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-digest-email',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "0f7758b121a2ec56c22b51b6852bff949858dddfec88a8d6"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  ) AS request_id;
$cmd$);

SELECT cron.alter_job(14, command := $cmd$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-digest-email',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "0f7758b121a2ec56c22b51b6852bff949858dddfec88a8d6"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  ) AS request_id;
$cmd$);