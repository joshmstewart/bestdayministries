-- Add reply tracking columns to contact_form_submissions
ALTER TABLE contact_form_submissions
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reply_message TEXT;

-- Add admin_notes column for internal notes
ALTER TABLE contact_form_submissions
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add index for replied_at for filtering
CREATE INDEX IF NOT EXISTS idx_contact_submissions_replied_at 
ON contact_form_submissions(replied_at);