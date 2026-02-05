-- Create album_likes table for liking album posts in the feed
CREATE TABLE public.album_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(album_id, user_id)
);

-- Enable RLS
ALTER TABLE public.album_likes ENABLE ROW LEVEL SECURITY;

-- Users can see all likes
CREATE POLICY "Users can view album likes"
  ON public.album_likes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can like albums
CREATE POLICY "Users can like albums"
  ON public.album_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike albums"
  ON public.album_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add likes_count column to albums if it doesn't exist
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger function to update likes_count
CREATE OR REPLACE FUNCTION public.update_album_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.albums SET likes_count = likes_count + 1 WHERE id = NEW.album_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.albums SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.album_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_album_likes_count_trigger ON public.album_likes;
CREATE TRIGGER update_album_likes_count_trigger
  AFTER INSERT OR DELETE ON public.album_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_album_likes_count();

-- Enable realtime for album_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.album_likes;