-- Add event_id column to discussion_posts table
ALTER TABLE discussion_posts ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE SET NULL;