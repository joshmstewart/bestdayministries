-- Add cc_emails column to store CC'd email addresses
ALTER TABLE contact_form_submissions 
ADD COLUMN cc_emails text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN contact_form_submissions.cc_emails IS 'Array of CC email addresses from inbound emails or added by admin';