-- Workout Tracker System

-- Workout categories for organizing videos
CREATE TABLE public.workout_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💪',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workout videos (YouTube embeds)
CREATE TABLE public.workout_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  category_id UUID REFERENCES public.workout_categories(id) ON DELETE SET NULL,
  duration_minutes INTEGER DEFAULT 10,
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  thumbnail_url TEXT,
  points INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quick activities (admin-managed list)
CREATE TABLE public.workout_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🚶',
  category TEXT DEFAULT 'general',
  points INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User workout logs (completed workouts)
CREATE TABLE public.user_workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('video', 'activity')),
  video_id UUID REFERENCES public.workout_videos(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.workout_activities(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_workout_reference CHECK (
    (workout_type = 'video' AND video_id IS NOT NULL) OR
    (workout_type = 'activity' AND activity_id IS NOT NULL)
  )
);

-- User workout goals (guardian-set for besties)
CREATE TABLE public.user_workout_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  weekly_activity_goal INTEGER DEFAULT 5,
  set_by UUID REFERENCES auth.users(id),
  coin_reward INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_categories (public read, admin write)
CREATE POLICY "Anyone can view active categories"
ON public.workout_categories FOR SELECT
USING (is_active = true OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage categories"
ON public.workout_categories FOR ALL
USING (has_admin_access(auth.uid()));

-- RLS Policies for workout_videos (public read, admin write)
CREATE POLICY "Anyone can view active videos"
ON public.workout_videos FOR SELECT
USING (is_active = true OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage videos"
ON public.workout_videos FOR ALL
USING (has_admin_access(auth.uid()));

-- RLS Policies for workout_activities (public read, admin write)
CREATE POLICY "Anyone can view active activities"
ON public.workout_activities FOR SELECT
USING (is_active = true OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage activities"
ON public.workout_activities FOR ALL
USING (has_admin_access(auth.uid()));

-- RLS Policies for user_workout_logs (users manage own, guardians can view linked besties)
CREATE POLICY "Users can view own workout logs"
ON public.user_workout_logs FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_admin_access(auth.uid())
  OR is_guardian_of(auth.uid(), user_id)
);

CREATE POLICY "Users can create own workout logs"
ON public.user_workout_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
ON public.user_workout_logs FOR DELETE
USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

-- RLS Policies for user_workout_goals (guardians set for besties)
CREATE POLICY "Users can view own goals"
ON public.user_workout_goals FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_admin_access(auth.uid())
  OR is_guardian_of(auth.uid(), user_id)
);

CREATE POLICY "Guardians can manage bestie goals"
ON public.user_workout_goals FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR has_admin_access(auth.uid())
  OR is_guardian_of(auth.uid(), user_id)
);

CREATE POLICY "Guardians can update bestie goals"
ON public.user_workout_goals FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_admin_access(auth.uid())
  OR is_guardian_of(auth.uid(), user_id)
);

CREATE POLICY "Admins can delete goals"
ON public.user_workout_goals FOR DELETE
USING (has_admin_access(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_workout_categories_updated_at
  BEFORE UPDATE ON public.workout_categories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_workout_videos_updated_at
  BEFORE UPDATE ON public.workout_videos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_workout_activities_updated_at
  BEFORE UPDATE ON public.workout_activities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_user_workout_goals_updated_at
  BEFORE UPDATE ON public.user_workout_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Insert default activities
INSERT INTO public.workout_activities (name, description, icon, category, points, display_order) VALUES
('Went for a walk', 'Walking around the block, neighborhood, or park', '🚶', 'walking', 1, 1),
('Went jogging', 'Light jogging or running', '🏃', 'walking', 1, 2),
('Played outside', 'Active outdoor play', '🌳', 'play', 1, 3),
('Played sports', 'Basketball, soccer, catch, etc.', '⚽', 'play', 1, 4),
('Did stretches', 'Stretching exercises at home', '🧘', 'home', 1, 5),
('Danced', 'Dancing to music', '💃', 'home', 1, 6),
('Did exercises', 'Push-ups, sit-ups, or other exercises', '💪', 'home', 1, 7),
('Swam', 'Swimming or water exercises', '🏊', 'play', 1, 8);

-- Insert default categories
INSERT INTO public.workout_categories (name, description, icon, display_order) VALUES
('Cardio', 'Get your heart pumping!', '❤️', 1),
('Stretching', 'Flexibility and relaxation', '🧘', 2),
('Dance', 'Fun dance workouts', '💃', 3),
('Strength', 'Build muscle and get strong', '💪', 4),
('Chair Exercises', 'Seated workouts for everyone', '🪑', 5);