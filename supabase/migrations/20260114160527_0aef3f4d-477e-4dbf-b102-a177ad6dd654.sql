-- Create saved_jokes table for storing user's favorite jokes
CREATE TABLE public.saved_jokes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'random',
  is_public BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  times_shared INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create joke_likes table for tracking likes
CREATE TABLE public.joke_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  joke_id UUID NOT NULL REFERENCES public.saved_jokes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(joke_id, user_id)
);

-- Enable RLS
ALTER TABLE public.saved_jokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joke_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_jokes
-- Users can view their own jokes
CREATE POLICY "Users can view own jokes"
  ON public.saved_jokes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public jokes
CREATE POLICY "Anyone can view public jokes"
  ON public.saved_jokes FOR SELECT
  USING (is_public = true);

-- Users can insert their own jokes
CREATE POLICY "Users can insert own jokes"
  ON public.saved_jokes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jokes
CREATE POLICY "Users can update own jokes"
  ON public.saved_jokes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own jokes
CREATE POLICY "Users can delete own jokes"
  ON public.saved_jokes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for joke_likes
-- Anyone authenticated can view likes
CREATE POLICY "Authenticated users can view likes"
  ON public.joke_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes"
  ON public.joke_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
  ON public.joke_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_saved_jokes_user_id ON public.saved_jokes(user_id);
CREATE INDEX idx_saved_jokes_is_public ON public.saved_jokes(is_public);
CREATE INDEX idx_joke_likes_joke_id ON public.joke_likes(joke_id);
CREATE INDEX idx_joke_likes_user_id ON public.joke_likes(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_saved_jokes_updated_at
  BEFORE UPDATE ON public.saved_jokes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create a trigger to update likes count
CREATE OR REPLACE FUNCTION public.update_joke_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.saved_jokes SET likes_count = likes_count + 1 WHERE id = NEW.joke_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.saved_jokes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.joke_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_joke_likes_count_trigger
  AFTER INSERT OR DELETE ON public.joke_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_joke_likes_count();