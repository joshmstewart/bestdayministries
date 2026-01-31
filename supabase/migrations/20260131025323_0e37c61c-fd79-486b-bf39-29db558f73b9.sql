-- Create daily fortune comments table
CREATE TABLE public.daily_fortune_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fortune_post_id UUID NOT NULL REFERENCES public.daily_fortune_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_fortune_comments ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone authenticated can view comments
CREATE POLICY "Anyone can view fortune comments"
ON public.daily_fortune_comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can create their own comments
CREATE POLICY "Users can create their own comments"
ON public.daily_fortune_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.daily_fortune_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete their own comments"
ON public.daily_fortune_comments
FOR DELETE
USING (auth.uid() = user_id OR public.is_admin_or_owner());

-- Create index for faster lookups
CREATE INDEX idx_daily_fortune_comments_post_id ON public.daily_fortune_comments(fortune_post_id);
CREATE INDEX idx_daily_fortune_comments_user_id ON public.daily_fortune_comments(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_fortune_comments;

-- Add updated_at trigger
CREATE TRIGGER update_daily_fortune_comments_updated_at
BEFORE UPDATE ON public.daily_fortune_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();