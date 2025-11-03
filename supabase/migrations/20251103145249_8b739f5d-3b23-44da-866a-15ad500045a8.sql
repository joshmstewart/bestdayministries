-- Add source field to contact_form_submissions table
ALTER TABLE contact_form_submissions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'form' CHECK (source IN ('form', 'email'));