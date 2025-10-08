-- Add column for admin consent to allow owner to claim posts
ALTER TABLE public.discussion_posts 
ADD COLUMN allow_owner_claim boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.discussion_posts.allow_owner_claim IS 'Admin consent flag allowing owners to change post authorship';