-- Add digest email preferences to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'never' CHECK (digest_frequency IN ('never', 'daily', 'weekly'));

-- Add last digest sent tracking
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp with time zone;

-- Create table to track digest email sends (for audit trail)
CREATE TABLE IF NOT EXISTS public.digest_emails_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  frequency text NOT NULL,
  notification_count integer NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on digest_emails_log
ALTER TABLE public.digest_emails_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own digest logs
CREATE POLICY "Users can view their own digest logs"
ON public.digest_emails_log
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all digest logs
CREATE POLICY "Admins can view all digest logs"
ON public.digest_emails_log
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Create function to get users who need digest emails
CREATE OR REPLACE FUNCTION public.get_users_needing_digest(_frequency text)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  unread_count bigint
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    n.user_id,
    p.email,
    COUNT(*) as unread_count
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id
  JOIN public.notification_preferences np ON np.user_id = n.user_id
  WHERE n.is_read = false
    AND np.digest_frequency = _frequency
    AND (
      (_frequency = 'daily' AND (np.last_digest_sent_at IS NULL OR np.last_digest_sent_at < now() - interval '23 hours')) OR
      (_frequency = 'weekly' AND (np.last_digest_sent_at IS NULL OR np.last_digest_sent_at < now() - interval '6 days 23 hours'))
    )
  GROUP BY n.user_id, p.email
  HAVING COUNT(*) > 0;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_users_needing_digest IS 'Returns users who have unread notifications and are due for a digest email based on their frequency preference';
