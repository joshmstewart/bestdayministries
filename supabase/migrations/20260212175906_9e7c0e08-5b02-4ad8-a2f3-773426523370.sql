
-- Add foreign key for album_comments.author_id -> profiles
ALTER TABLE public.album_comments
  ADD CONSTRAINT album_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
