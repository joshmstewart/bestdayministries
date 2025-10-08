-- Add in-app notification preference columns to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN inapp_on_pending_approval BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_approval_decision BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_new_sponsor_message BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_message_approved BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_message_rejected BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_new_event BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_event_update BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN inapp_on_new_sponsorship BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_sponsorship_update BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_comment_on_post BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN inapp_on_comment_on_thread BOOLEAN NOT NULL DEFAULT true;

-- Drop and recreate the get_notification_preferences function with new signature
DROP FUNCTION IF EXISTS public.get_notification_preferences(uuid);

CREATE OR REPLACE FUNCTION public.get_notification_preferences(_user_id uuid)
RETURNS TABLE(
  email_on_pending_approval boolean,
  email_on_approval_decision boolean,
  email_on_new_sponsor_message boolean,
  email_on_message_approved boolean,
  email_on_message_rejected boolean,
  email_on_new_event boolean,
  email_on_event_update boolean,
  email_on_new_sponsorship boolean,
  email_on_sponsorship_update boolean,
  email_on_comment_on_post boolean,
  email_on_comment_on_thread boolean,
  inapp_on_pending_approval boolean,
  inapp_on_approval_decision boolean,
  inapp_on_new_sponsor_message boolean,
  inapp_on_message_approved boolean,
  inapp_on_message_rejected boolean,
  inapp_on_new_event boolean,
  inapp_on_event_update boolean,
  inapp_on_new_sponsorship boolean,
  inapp_on_sponsorship_update boolean,
  inapp_on_comment_on_post boolean,
  inapp_on_comment_on_thread boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(np.email_on_pending_approval, true),
    COALESCE(np.email_on_approval_decision, true),
    COALESCE(np.email_on_new_sponsor_message, true),
    COALESCE(np.email_on_message_approved, true),
    COALESCE(np.email_on_message_rejected, true),
    COALESCE(np.email_on_new_event, true),
    COALESCE(np.email_on_event_update, false),
    COALESCE(np.email_on_new_sponsorship, true),
    COALESCE(np.email_on_sponsorship_update, true),
    COALESCE(np.email_on_comment_on_post, true),
    COALESCE(np.email_on_comment_on_thread, true),
    COALESCE(np.inapp_on_pending_approval, true),
    COALESCE(np.inapp_on_approval_decision, true),
    COALESCE(np.inapp_on_new_sponsor_message, true),
    COALESCE(np.inapp_on_message_approved, true),
    COALESCE(np.inapp_on_message_rejected, true),
    COALESCE(np.inapp_on_new_event, true),
    COALESCE(np.inapp_on_event_update, false),
    COALESCE(np.inapp_on_new_sponsorship, true),
    COALESCE(np.inapp_on_sponsorship_update, true),
    COALESCE(np.inapp_on_comment_on_post, true),
    COALESCE(np.inapp_on_comment_on_thread, true)
  FROM public.notification_preferences np
  WHERE np.user_id = _user_id
  UNION ALL
  SELECT true, true, true, true, true, true, false, true, true, true, true,
         true, true, true, true, true, true, false, true, true, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_preferences WHERE user_id = _user_id
  )
  LIMIT 1;
$$;