ALTER TABLE public.contact_form_submissions 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;