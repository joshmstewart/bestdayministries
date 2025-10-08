-- Add message_type and image_url to contact_form_submissions
ALTER TABLE public.contact_form_submissions
ADD COLUMN message_type TEXT DEFAULT 'general',
ADD COLUMN image_url TEXT;

-- Add check constraint for message_type
ALTER TABLE public.contact_form_submissions
ADD CONSTRAINT valid_message_type 
CHECK (message_type IN ('bug_report', 'feature_request', 'general', 'question', 'feedback'));