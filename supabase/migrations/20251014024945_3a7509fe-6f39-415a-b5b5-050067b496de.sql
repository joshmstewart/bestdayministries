-- Create contact form replies table for threaded conversations
CREATE TABLE IF NOT EXISTS public.contact_form_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.contact_form_submissions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for fast lookups
CREATE INDEX idx_contact_form_replies_submission ON public.contact_form_replies(submission_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_form_replies ENABLE ROW LEVEL SECURITY;

-- Admins can view all replies
CREATE POLICY "Admins can view all replies" ON public.contact_form_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Admins can insert replies
CREATE POLICY "Admins can insert replies" ON public.contact_form_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Migrate existing replies from contact_form_submissions to the new table
INSERT INTO public.contact_form_replies (
  submission_id,
  sender_type,
  sender_id,
  sender_name,
  sender_email,
  message,
  created_at
)
SELECT 
  s.id,
  'admin' as sender_type,
  s.replied_by,
  COALESCE(p.display_name, 'Admin') as sender_name,
  COALESCE(cs.reply_from_email, 'admin@example.com') as sender_email,
  s.reply_message,
  s.replied_at
FROM public.contact_form_submissions s
LEFT JOIN public.profiles p ON p.id = s.replied_by
CROSS JOIN LATERAL (
  SELECT reply_from_email
  FROM public.contact_form_settings
  LIMIT 1
) cs
WHERE s.reply_message IS NOT NULL
  AND s.replied_at IS NOT NULL
  AND NOT EXISTS (
    -- Don't duplicate if already migrated
    SELECT 1 FROM public.contact_form_replies r
    WHERE r.submission_id = s.id
    AND r.sender_type = 'admin'
    AND r.message = s.reply_message
  );

-- Add trigger to update submissions table when first reply is added
CREATE OR REPLACE FUNCTION update_submission_on_first_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is an admin reply and no prior admin replies exist
  IF NEW.sender_type = 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contact_form_replies
      WHERE submission_id = NEW.submission_id
        AND sender_type = 'admin'
        AND id != NEW.id
        AND created_at < NEW.created_at
    ) THEN
      UPDATE public.contact_form_submissions
      SET 
        replied_at = NEW.created_at,
        replied_by = NEW.sender_id,
        reply_message = NEW.message,
        status = 'read'
      WHERE id = NEW.submission_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_reply_inserted
  AFTER INSERT ON public.contact_form_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_on_first_reply();