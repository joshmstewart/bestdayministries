DO $migration$
DECLARE
  fortune_job record;
BEGIN
  SELECT jobid, command INTO STRICT fortune_job
  FROM cron.job
  WHERE jobname = 'generate-fortune-posts-daily';
  IF fortune_job.command NOT LIKE '%$fortune_midnight$%' THEN
    PERFORM cron.alter_job(
      fortune_job.jobid,
      schedule := '0 6,7 * * *',
      command := format('DO $fortune_midnight$ BEGIN IF EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE ''America/Denver'') = 0 THEN EXECUTE %L; END IF; END $fortune_midnight$;', fortune_job.command)
    );
  END IF;
END
$migration$;