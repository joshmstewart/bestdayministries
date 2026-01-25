-- Create content_announcement_likes table
CREATE TABLE public.content_announcement_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.content_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.content_announcement_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all announcement likes"
  ON public.content_announcement_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like announcements"
  ON public.content_announcement_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.content_announcement_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add likes_count to content_announcements if not exists
ALTER TABLE public.content_announcements 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger function to update likes count
CREATE OR REPLACE FUNCTION public.update_announcement_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.content_announcements 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.announcement_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.content_announcements 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.announcement_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_announcement_likes_count_trigger ON public.content_announcement_likes;
CREATE TRIGGER update_announcement_likes_count_trigger
AFTER INSERT OR DELETE ON public.content_announcement_likes
FOR EACH ROW EXECUTE FUNCTION public.update_announcement_likes_count();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_announcement_likes;