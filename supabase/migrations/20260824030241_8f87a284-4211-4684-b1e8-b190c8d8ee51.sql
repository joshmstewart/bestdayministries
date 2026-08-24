CREATE OR REPLACE FUNCTION public.claim_newsletter_queue_batch(p_limit integer DEFAULT 80)
RETURNS SETOF public.newsletter_email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recover items stuck in 'processing' (function crash / timeout) so they retry.
  UPDATE public.newsletter_email_queue
  SET status = 'pending'
  WHERE status = 'processing'
    AND created_at < now() - interval '10 minutes'
    AND (processed_at IS NULL OR processed_at < now() - interval '10 minutes');

  -- Atomically claim a batch: SKIP LOCKED guarantees no two concurrent runs
  -- claim the same row, which previously caused duplicate emails.
  RETURN QUERY
  UPDATE public.newsletter_email_queue q
  SET status = 'processing',
      attempts = q.attempts + 1
  WHERE q.id IN (
    SELECT s.id
    FROM public.newsletter_email_queue s
    WHERE s.status = 'pending'
    ORDER BY s.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_newsletter_queue_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_newsletter_queue_batch(integer) TO service_role;