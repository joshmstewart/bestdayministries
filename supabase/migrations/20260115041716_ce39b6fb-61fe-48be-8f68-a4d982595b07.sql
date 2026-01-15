-- Prayer requests table
CREATE TABLE public.prayer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMP WITH TIME ZONE,
  answer_notes TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Likes table for prayer requests
CREATE TABLE public.prayer_request_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

-- Enable RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_request_likes ENABLE ROW LEVEL SECURITY;

-- Prayer requests policies
CREATE POLICY "Users can view their own prayer requests"
  ON public.prayer_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public prayer requests"
  ON public.prayer_requests FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own prayer requests"
  ON public.prayer_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prayer requests"
  ON public.prayer_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prayer requests"
  ON public.prayer_requests FOR DELETE
  USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view all likes"
  ON public.prayer_request_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can like prayer requests"
  ON public.prayer_request_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike prayer requests"
  ON public.prayer_request_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests;