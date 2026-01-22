-- Add assigned_to column to contact_form_submissions
ALTER TABLE public.contact_form_submissions 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_contact_form_submissions_assigned_to 
ON public.contact_form_submissions(assigned_to);

-- Add comment
COMMENT ON COLUMN public.contact_form_submissions.assigned_to IS 'Admin user this message is assigned to for handling';