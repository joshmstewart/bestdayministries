-- Create event_likes table for tracking event likes in the community feed
CREATE TABLE public.event_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Add likes_count column to events table if it doesn't exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_likes
CREATE POLICY "Anyone authenticated can view event likes"
  ON public.event_likes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own event likes"
  ON public.event_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event likes"
  ON public.event_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function to update likes_count on events
CREATE OR REPLACE FUNCTION public.update_event_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events SET likes_count = likes_count + 1 WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-updating likes count
CREATE TRIGGER update_event_likes_count_trigger
AFTER INSERT OR DELETE ON public.event_likes
FOR EACH ROW EXECUTE FUNCTION public.update_event_likes_count();