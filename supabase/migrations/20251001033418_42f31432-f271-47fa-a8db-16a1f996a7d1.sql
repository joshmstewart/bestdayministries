-- Add moderation_notes column to discussion_comments
ALTER TABLE public.discussion_comments
ADD COLUMN moderation_notes text;