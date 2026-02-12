
-- Create album_comments table
CREATE TABLE public.album_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments_count to albums for quick display
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.album_comments ENABLE ROW LEVEL SECURITY;

-- RLS: Any authenticated user can view comments on active albums
CREATE POLICY "Authenticated users can view album comments"
  ON public.album_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: Authenticated users can insert their own comments
CREATE POLICY "Authenticated users can create album comments"
  ON public.album_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- RLS: Authors can update their own comments
CREATE POLICY "Authors can update own album comments"
  ON public.album_comments FOR UPDATE
  USING (auth.uid() = author_id);

-- RLS: Authors and admins can delete comments
CREATE POLICY "Authors and admins can delete album comments"
  ON public.album_comments FOR DELETE
  USING (auth.uid() = author_id OR public.is_admin_or_owner());

-- Trigger to update comments_count on albums
CREATE OR REPLACE FUNCTION public.update_album_comments_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.albums SET comments_count = comments_count + 1 WHERE id = NEW.album_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.albums SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.album_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_album_comments_count_trigger
  AFTER INSERT OR DELETE ON public.album_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_album_comments_count();

-- Trigger for updated_at
CREATE TRIGGER update_album_comments_updated_at
  BEFORE UPDATE ON public.album_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for album comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.album_comments;

-- Index for fast lookups
CREATE INDEX idx_album_comments_album_id ON public.album_comments(album_id);
CREATE INDEX idx_album_comments_author_id ON public.album_comments(author_id);
