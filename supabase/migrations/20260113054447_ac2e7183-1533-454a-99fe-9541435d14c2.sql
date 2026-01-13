-- Create beat pad creations table
CREATE TABLE public.beat_pad_creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Beat',
  pattern JSONB NOT NULL DEFAULT '{}',
  tempo INTEGER NOT NULL DEFAULT 120,
  is_public BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create beat pad likes table
CREATE TABLE public.beat_pad_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID NOT NULL REFERENCES public.beat_pad_creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.beat_pad_creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_pad_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for beat_pad_creations
CREATE POLICY "Users can view public creations"
  ON public.beat_pad_creations FOR SELECT
  USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create their own beats"
  ON public.beat_pad_creations FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own beats"
  ON public.beat_pad_creations FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own beats"
  ON public.beat_pad_creations FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS policies for beat_pad_likes
CREATE POLICY "Anyone can view likes"
  ON public.beat_pad_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like creations"
  ON public.beat_pad_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike creations"
  ON public.beat_pad_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_beat_pad_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.beat_pad_creations SET likes_count = likes_count + 1 WHERE id = NEW.creation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.beat_pad_creations SET likes_count = likes_count - 1 WHERE id = OLD.creation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_beat_pad_likes_count_trigger
AFTER INSERT OR DELETE ON public.beat_pad_likes
FOR EACH ROW EXECUTE FUNCTION public.update_beat_pad_likes_count();

-- Update timestamp trigger
CREATE TRIGGER update_beat_pad_creations_updated_at
BEFORE UPDATE ON public.beat_pad_creations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.beat_pad_creations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beat_pad_likes;