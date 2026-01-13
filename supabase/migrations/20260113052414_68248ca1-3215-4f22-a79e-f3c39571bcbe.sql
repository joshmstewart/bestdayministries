-- Monthly Chore Challenge System
-- Users build a scene by placing stickers each day they complete all chores

-- Monthly challenge themes (admin-configurable)
CREATE TABLE public.chore_challenge_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  background_options JSONB NOT NULL DEFAULT '[]', -- [{id, name, image_url}]
  sticker_elements JSONB NOT NULL DEFAULT '[]', -- [{id, name, image_url, category}]
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_description TEXT,
  coin_reward INTEGER NOT NULL DEFAULT 100,
  days_required INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- User's progress on monthly challenge
CREATE TABLE public.chore_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.chore_challenge_themes(id) ON DELETE CASCADE,
  selected_background TEXT, -- id from background_options
  placed_stickers JSONB NOT NULL DEFAULT '[]', -- [{sticker_id, x, y, scale, rotation, placed_on_date}]
  completion_days INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  shared_at TIMESTAMP WITH TIME ZONE,
  shared_image_url TEXT, -- Rendered image when shared
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

-- Track which days user earned a sticker placement
CREATE TABLE public.chore_challenge_daily_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.chore_challenge_themes(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  sticker_earned BOOLEAN NOT NULL DEFAULT true,
  sticker_placed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id, completion_date)
);

-- Shared creations gallery (community showcase)
CREATE TABLE public.chore_challenge_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_id UUID NOT NULL REFERENCES public.chore_challenge_progress(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.chore_challenge_themes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Likes for gallery items
CREATE TABLE public.chore_challenge_gallery_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.chore_challenge_gallery(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gallery_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chore_challenge_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_challenge_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_challenge_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_challenge_gallery_likes ENABLE ROW LEVEL SECURITY;

-- Themes: everyone can read active, admins manage
CREATE POLICY "Anyone can view active themes" ON public.chore_challenge_themes
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage themes" ON public.chore_challenge_themes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Progress: users see own, guardians see linked besties
CREATE POLICY "Users can view own progress" ON public.chore_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Guardians can view bestie progress" ON public.chore_challenge_progress
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links WHERE caregiver_id = auth.uid() AND bestie_id = user_id
  ));

CREATE POLICY "Users can manage own progress" ON public.chore_challenge_progress
  FOR ALL USING (auth.uid() = user_id);

-- Daily completions: same as progress
CREATE POLICY "Users can view own completions" ON public.chore_challenge_daily_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON public.chore_challenge_daily_completions
  FOR ALL USING (auth.uid() = user_id);

-- Gallery: everyone can view, users manage own
CREATE POLICY "Anyone can view gallery" ON public.chore_challenge_gallery
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own gallery items" ON public.chore_challenge_gallery
  FOR ALL USING (auth.uid() = user_id);

-- Gallery likes: authenticated users
CREATE POLICY "Users can view likes" ON public.chore_challenge_gallery_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON public.chore_challenge_gallery_likes
  FOR ALL USING (auth.uid() = user_id);

-- Function to check if user completed all chores today
CREATE OR REPLACE FUNCTION public.check_daily_chore_completion(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  total_chores INTEGER;
  completed_chores INTEGER;
BEGIN
  -- Get total active chores for user
  SELECT COUNT(*) INTO total_chores
  FROM public.chores
  WHERE bestie_id = p_user_id AND is_active = true;
  
  IF total_chores = 0 THEN
    RETURN false;
  END IF;
  
  -- Get completed chores for date
  SELECT COUNT(*) INTO completed_chores
  FROM public.chore_completions
  WHERE user_id = p_user_id AND completed_date = p_date;
  
  RETURN completed_chores >= total_chores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to award sticker when all chores completed
CREATE OR REPLACE FUNCTION public.handle_chore_completion_for_challenge()
RETURNS TRIGGER AS $$
DECLARE
  v_theme_id UUID;
  v_all_done BOOLEAN;
BEGIN
  -- Check if all chores are done for this date
  v_all_done := public.check_daily_chore_completion(NEW.user_id, NEW.completed_date);
  
  IF v_all_done THEN
    -- Get current month's theme
    SELECT id INTO v_theme_id
    FROM public.chore_challenge_themes
    WHERE month = EXTRACT(MONTH FROM NEW.completed_date)::INTEGER
      AND year = EXTRACT(YEAR FROM NEW.completed_date)::INTEGER
      AND is_active = true;
    
    IF v_theme_id IS NOT NULL THEN
      -- Create or update daily completion
      INSERT INTO public.chore_challenge_daily_completions (user_id, theme_id, completion_date)
      VALUES (NEW.user_id, v_theme_id, NEW.completed_date)
      ON CONFLICT (user_id, theme_id, completion_date) DO NOTHING;
      
      -- Update progress completion count
      UPDATE public.chore_challenge_progress
      SET completion_days = (
        SELECT COUNT(*) FROM public.chore_challenge_daily_completions
        WHERE user_id = NEW.user_id AND theme_id = v_theme_id
      ),
      updated_at = now()
      WHERE user_id = NEW.user_id AND theme_id = v_theme_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_chore_completion_check_challenge
  AFTER INSERT ON public.chore_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_chore_completion_for_challenge();

-- Add indexes for performance
CREATE INDEX idx_challenge_progress_user ON public.chore_challenge_progress(user_id);
CREATE INDEX idx_challenge_progress_theme ON public.chore_challenge_progress(theme_id);
CREATE INDEX idx_challenge_daily_user_theme ON public.chore_challenge_daily_completions(user_id, theme_id);
CREATE INDEX idx_challenge_gallery_theme ON public.chore_challenge_gallery(theme_id);
CREATE INDEX idx_challenge_themes_month_year ON public.chore_challenge_themes(month, year);