-- Add public sharing support to user_colorings
ALTER TABLE public.user_colorings 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Create coloring_likes table for community likes (similar to custom_drink_likes)
CREATE TABLE IF NOT EXISTS public.coloring_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coloring_id UUID NOT NULL REFERENCES public.user_colorings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coloring_id, user_id)
);

-- Add likes_count column to user_colorings for easier querying
ALTER TABLE public.user_colorings 
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Enable RLS on coloring_likes
ALTER TABLE public.coloring_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for coloring_likes
CREATE POLICY "Users can view all likes"
ON public.coloring_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like colorings"
ON public.coloring_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
ON public.coloring_likes FOR DELETE
USING (auth.uid() = user_id);

-- Update user_colorings RLS to allow viewing public colorings
DROP POLICY IF EXISTS "Users can view their own colorings" ON public.user_colorings;
CREATE POLICY "Users can view own or public colorings"
ON public.user_colorings FOR SELECT
USING (user_id = auth.uid() OR is_public = true);

-- Enable realtime for coloring_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.coloring_likes;