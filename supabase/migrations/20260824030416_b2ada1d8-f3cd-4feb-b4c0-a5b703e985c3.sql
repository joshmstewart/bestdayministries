CREATE OR REPLACE FUNCTION public.release_newsletter_queue_items(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.newsletter_email_queue
  SET status = 'pending',
      processed_at = NULL,
      attempts = GREATEST(attempts - 1, 0)
  WHERE id = ANY(p_ids)
    AND status = 'processing';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_newsletter_queue_items(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_newsletter_queue_items(uuid[]) TO service_role;