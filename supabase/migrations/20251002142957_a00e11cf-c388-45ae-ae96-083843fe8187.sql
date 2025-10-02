-- Add approval settings to caregiver_bestie_links table
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN require_post_approval boolean NOT NULL DEFAULT false,
ADD COLUMN require_comment_approval boolean NOT NULL DEFAULT false;