-- Create table to track tour completions
CREATE TABLE IF NOT EXISTS public.tour_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.help_tours(id) ON DELETE CASCADE,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

-- Enable RLS
ALTER TABLE public.tour_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view their own tour completions"
  ON public.tour_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can mark tours as complete"
  ON public.tour_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all completions
CREATE POLICY "Admins can view all tour completions"
  ON public.tour_completions
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tour_completions_user_id ON public.tour_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_completions_tour_id ON public.tour_completions(tour_id);