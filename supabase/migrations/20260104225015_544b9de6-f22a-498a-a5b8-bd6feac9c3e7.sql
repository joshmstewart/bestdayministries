-- Table to track picture password notifications for guardians and besties
CREATE TABLE public.picture_password_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('feature_prompt', 'bestie_created_code')),
    related_bestie_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    related_bestie_name TEXT,
    picture_sequence TEXT[], -- Store the code sequence for guardian notifications
    is_read BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    remind_after TIMESTAMPTZ, -- For "remind me later" functionality
    dont_show_again BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_picture_password_notifications_user ON picture_password_notifications(user_id);
CREATE INDEX idx_picture_password_notifications_unread ON picture_password_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE public.picture_password_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.picture_password_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read, dismiss, etc.)
CREATE POLICY "Users can update own notifications"
ON public.picture_password_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
ON public.picture_password_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.picture_password_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to notify guardians when a bestie creates a picture password
CREATE OR REPLACE FUNCTION notify_guardians_of_picture_password()
RETURNS TRIGGER AS $$
DECLARE
    guardian_record RECORD;
    bestie_name TEXT;
BEGIN
    -- Get the bestie's name
    SELECT display_name INTO bestie_name 
    FROM profiles 
    WHERE id = NEW.user_id;

    -- Find all guardians linked to this bestie
    FOR guardian_record IN 
        SELECT caregiver_id 
        FROM caregiver_bestie_links 
        WHERE bestie_id = NEW.user_id
    LOOP
        -- Create notification for each guardian
        INSERT INTO picture_password_notifications (
            user_id,
            notification_type,
            related_bestie_id,
            related_bestie_name,
            picture_sequence
        ) VALUES (
            guardian_record.caregiver_id,
            'bestie_created_code',
            NEW.user_id,
            bestie_name,
            NEW.picture_sequence
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to picture_passwords table
CREATE TRIGGER on_picture_password_created
AFTER INSERT ON picture_passwords
FOR EACH ROW
EXECUTE FUNCTION notify_guardians_of_picture_password();

-- Also trigger when picture password is updated (regenerated)
CREATE TRIGGER on_picture_password_updated
AFTER UPDATE OF picture_sequence ON picture_passwords
FOR EACH ROW
WHEN (OLD.picture_sequence IS DISTINCT FROM NEW.picture_sequence)
EXECUTE FUNCTION notify_guardians_of_picture_password();