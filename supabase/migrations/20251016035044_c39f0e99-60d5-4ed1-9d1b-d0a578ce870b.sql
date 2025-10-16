-- Fix get_users_needing_digest RPC to check enable_digest_emails preference
CREATE OR REPLACE FUNCTION public.get_users_needing_digest(_frequency text)
RETURNS TABLE(user_id uuid, user_email text, unread_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    n.user_id,
    p.email,
    COUNT(*) as unread_count
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id
  JOIN public.notification_preferences np ON np.user_id = n.user_id
  WHERE n.is_read = false
    AND np.digest_frequency = _frequency
    AND np.enable_digest_emails = true
    AND (
      (_frequency = 'daily' AND (np.last_digest_sent_at IS NULL OR np.last_digest_sent_at < now() - interval '23 hours')) OR
      (_frequency = 'weekly' AND (np.last_digest_sent_at IS NULL OR np.last_digest_sent_at < now() - interval '6 days 23 hours'))
    )
  GROUP BY n.user_id, p.email
  HAVING COUNT(*) > 0;
$function$;