-- Add image support columns to sponsor_messages
ALTER TABLE public.sponsor_messages
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS moderation_result JSONB,
ADD COLUMN IF NOT EXISTS moderation_severity TEXT CHECK (moderation_severity IN ('low', 'medium', 'high'));

-- Add index for pending moderation queries
CREATE INDEX IF NOT EXISTS idx_sponsor_messages_moderation 
ON public.sponsor_messages(status) 
WHERE status = 'pending_moderation';

-- Update RLS policy to allow admins to approve moderated messages
DROP POLICY IF EXISTS "Admins can update message status" ON public.sponsor_messages;
CREATE POLICY "Admins can update message status"
ON public.sponsor_messages
FOR UPDATE
USING (
  has_admin_access(auth.uid())
)
WITH CHECK (
  has_admin_access(auth.uid())
);