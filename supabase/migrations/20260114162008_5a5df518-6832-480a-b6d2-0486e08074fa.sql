-- Create joke library table for pre-generated jokes
CREATE TABLE public.joke_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'random',
  is_active BOOLEAN DEFAULT true,
  times_served INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on question to prevent duplicates
CREATE UNIQUE INDEX joke_library_question_unique ON public.joke_library (LOWER(question));

-- Enable RLS
ALTER TABLE public.joke_library ENABLE ROW LEVEL SECURITY;

-- Everyone can read active jokes
CREATE POLICY "Anyone can read active jokes"
  ON public.joke_library FOR SELECT
  USING (is_active = true);

-- Admins can manage jokes
CREATE POLICY "Admins can manage joke library"
  ON public.joke_library FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- Create function to get a random unseen joke for a user
CREATE OR REPLACE FUNCTION public.get_random_unseen_joke(_user_id UUID, _category TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, question TEXT, answer TEXT, category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jl.id, jl.question, jl.answer, jl.category
  FROM joke_library jl
  WHERE jl.is_active = true
    AND (_category IS NULL OR _category = 'random' OR jl.category = _category)
    AND NOT EXISTS (
      SELECT 1 FROM user_joke_history ujh
      WHERE ujh.user_id = _user_id AND ujh.joke_question = jl.question
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;