-- Create mood_responses table for pre-generated encouraging messages
CREATE TABLE public.mood_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion TEXT NOT NULL,
  emoji TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.mood_responses ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read mood responses"
ON public.mood_responses
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage
CREATE POLICY "Admins can manage mood responses"
ON public.mood_responses
FOR ALL
USING (public.is_admin_or_owner());

-- Add index for quick lookups
CREATE INDEX idx_mood_responses_emotion ON public.mood_responses(emotion, is_active);