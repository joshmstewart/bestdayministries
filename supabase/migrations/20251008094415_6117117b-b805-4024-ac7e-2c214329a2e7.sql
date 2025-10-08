-- Add product update notification preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_product_update BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS inapp_on_product_update BOOLEAN DEFAULT TRUE;

-- Drop and recreate get_notification_preferences function with new fields
DROP FUNCTION IF EXISTS public.get_notification_preferences(uuid);

CREATE FUNCTION public.get_notification_preferences(_user_id uuid)
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
  email_on_product_update boolean,
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
  inapp_on_comment_on_thread boolean,
  inapp_on_product_update boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    COALESCE(np.email_on_product_update, true),
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
    COALESCE(np.inapp_on_comment_on_thread, true),
    COALESCE(np.inapp_on_product_update, true)
  FROM public.notification_preferences np
  WHERE np.user_id = _user_id
  UNION ALL
  SELECT true, true, true, true, true, true, false, true, true, true, true, true,
         true, true, true, true, true, true, false, true, true, true, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_preferences WHERE user_id = _user_id
  )
  LIMIT 1;
$function$;