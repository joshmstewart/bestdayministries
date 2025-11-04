-- Update contact_form_submissions status field to support ticketing statuses
-- Drop existing constraint if it exists
ALTER TABLE contact_form_submissions 
DROP CONSTRAINT IF EXISTS contact_form_submissions_status_check;

-- Add new constraint with expanded status values
ALTER TABLE contact_form_submissions 
ADD CONSTRAINT contact_form_submissions_status_check 
CHECK (status IN ('new', 'read', 'backlog', 'in_progress', 'done', 'wont_fix'));

-- Update any existing 'read' statuses to maintain current behavior
-- (read becomes the default "viewed but not categorized" status)