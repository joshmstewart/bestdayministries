-- Create enum for message status
CREATE TYPE message_status AS ENUM ('pending_approval', 'approved', 'rejected', 'sent');

-- Create sponsor_messages table
CREATE TABLE public.sponsor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestie_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'pending_approval',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Add guardian control columns to caregiver_bestie_links
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN allow_sponsor_messages BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN require_message_approval BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS
ALTER TABLE public.sponsor_messages ENABLE ROW LEVEL SECURITY;

-- Besties can create their own messages (if allowed by guardian)
CREATE POLICY "Besties can create messages if allowed"
ON public.sponsor_messages
FOR INSERT
WITH CHECK (
  auth.uid() = bestie_id
  AND EXISTS (
    SELECT 1 FROM caregiver_bestie_links
    WHERE bestie_id = sponsor_messages.bestie_id
      AND allow_sponsor_messages = true
  )
);

-- Besties can view their own messages
CREATE POLICY "Besties can view their own messages"
ON public.sponsor_messages
FOR SELECT
USING (auth.uid() = bestie_id);

-- Guardians can view messages from their linked besties
CREATE POLICY "Guardians can view messages from linked besties"
ON public.sponsor_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_messages.bestie_id
  )
);

-- Guardians can update message status (approve/reject)
CREATE POLICY "Guardians can update message status"
ON public.sponsor_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_messages.bestie_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM caregiver_bestie_links
    WHERE caregiver_id = auth.uid()
      AND bestie_id = sponsor_messages.bestie_id
  )
);

-- Admins can view and manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.sponsor_messages
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_sponsor_messages_bestie_status ON public.sponsor_messages(bestie_id, status);
CREATE INDEX idx_sponsor_messages_status ON public.sponsor_messages(status);