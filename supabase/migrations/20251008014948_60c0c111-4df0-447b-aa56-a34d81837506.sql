-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Guardian approval notifications
  email_on_pending_approval BOOLEAN NOT NULL DEFAULT true,
  email_on_approval_decision BOOLEAN NOT NULL DEFAULT true,
  
  -- Bestie message notifications
  email_on_new_sponsor_message BOOLEAN NOT NULL DEFAULT true,
  email_on_message_approved BOOLEAN NOT NULL DEFAULT true,
  email_on_message_rejected BOOLEAN NOT NULL DEFAULT true,
  
  -- Event notifications
  email_on_new_event BOOLEAN NOT NULL DEFAULT true,
  email_on_event_update BOOLEAN NOT NULL DEFAULT false,
  
  -- Sponsorship notifications
  email_on_new_sponsorship BOOLEAN NOT NULL DEFAULT true,
  email_on_sponsorship_update BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email notifications log table (for tracking and debugging)
CREATE TABLE public.email_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed'
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for email_notifications_log
CREATE POLICY "Users can view their own notification logs"
  ON public.email_notifications_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
  ON public.email_notifications_log
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user email notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(_user_id UUID)
RETURNS TABLE (
  email_on_pending_approval BOOLEAN,
  email_on_approval_decision BOOLEAN,
  email_on_new_sponsor_message BOOLEAN,
  email_on_message_approved BOOLEAN,
  email_on_message_rejected BOOLEAN,
  email_on_new_event BOOLEAN,
  email_on_event_update BOOLEAN,
  email_on_new_sponsorship BOOLEAN,
  email_on_sponsorship_update BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    COALESCE(np.email_on_sponsorship_update, true)
  FROM public.notification_preferences np
  WHERE np.user_id = _user_id
  UNION ALL
  SELECT true, true, true, true, true, true, false, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_preferences WHERE user_id = _user_id
  )
  LIMIT 1;
$$;