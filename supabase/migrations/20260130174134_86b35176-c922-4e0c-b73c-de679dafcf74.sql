-- =====================================================
-- DAILY MOOD CHECK-IN SYSTEM
-- =====================================================

-- Table for mood entries
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_emoji TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  note TEXT,
  audio_url TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Encouraging messages for each mood (admin-managed)
CREATE TABLE public.mood_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_emoji TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mood_entries
CREATE POLICY "Users can view their own mood entries"
ON public.mood_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood entries"
ON public.mood_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries"
ON public.mood_entries FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for mood_messages (read by all auth, manage by admins)
CREATE POLICY "Anyone authenticated can view active mood messages"
ON public.mood_messages FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin_or_owner());

CREATE POLICY "Admins can manage mood messages"
ON public.mood_messages FOR ALL
TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- =====================================================
-- DAILY FORTUNE / INSPIRATION SYSTEM
-- =====================================================

-- Library of fortunes (AI-generated, admin-approved)
CREATE TABLE public.daily_fortunes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('quote', 'affirmation', 'bible_verse')),
  author TEXT,
  reference TEXT, -- For bible verses: "John 3:16"
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Daily fortune posts (one per day, linked to discussions)
CREATE TABLE public.daily_fortune_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fortune_id UUID NOT NULL REFERENCES public.daily_fortunes(id),
  post_date DATE NOT NULL UNIQUE,
  discussion_post_id UUID, -- Link to discussion_posts for comments
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fortune likes
CREATE TABLE public.daily_fortune_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fortune_post_id UUID NOT NULL REFERENCES public.daily_fortune_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fortune_post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.daily_fortunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_fortune_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_fortune_likes ENABLE ROW LEVEL SECURITY;

-- RLS for daily_fortunes
CREATE POLICY "Admins can manage fortunes"
ON public.daily_fortunes FOR ALL
TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- RLS for daily_fortune_posts
CREATE POLICY "Anyone authenticated can view fortune posts"
ON public.daily_fortune_posts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage fortune posts"
ON public.daily_fortune_posts FOR ALL
TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- RLS for daily_fortune_likes
CREATE POLICY "Users can view all fortune likes"
ON public.daily_fortune_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own fortune likes"
ON public.daily_fortune_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fortune likes"
ON public.daily_fortune_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update fortune likes count
CREATE OR REPLACE FUNCTION public.update_fortune_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.daily_fortune_posts SET likes_count = likes_count + 1 WHERE id = NEW.fortune_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.daily_fortune_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.fortune_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_fortune_likes_count_trigger
AFTER INSERT OR DELETE ON public.daily_fortune_likes
FOR EACH ROW EXECUTE FUNCTION public.update_fortune_likes_count();

-- =====================================================
-- STREAK BONUS SYSTEM
-- =====================================================

-- Streak milestones configuration
CREATE TABLE public.streak_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  days_required INTEGER NOT NULL UNIQUE,
  bonus_coins INTEGER NOT NULL DEFAULT 0,
  free_sticker_packs INTEGER NOT NULL DEFAULT 1,
  badge_name TEXT,
  badge_icon TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User streak tracking
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  next_milestone_days INTEGER,
  total_login_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User earned milestones
CREATE TABLE public.user_streak_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.streak_milestones(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  sticker_packs_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, milestone_id)
);

-- Enable RLS
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streak_milestones ENABLE ROW LEVEL SECURITY;

-- RLS for streak_milestones (public read, admin write)
CREATE POLICY "Anyone authenticated can view streak milestones"
ON public.streak_milestones FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin_or_owner());

CREATE POLICY "Admins can manage streak milestones"
ON public.streak_milestones FOR ALL
TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- RLS for user_streaks
CREATE POLICY "Users can view their own streak"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
ON public.user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.user_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for user_streak_milestones
CREATE POLICY "Users can view their own milestones"
ON public.user_streak_milestones FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
ON public.user_streak_milestones FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default milestones
INSERT INTO public.streak_milestones (days_required, bonus_coins, free_sticker_packs, badge_name, badge_icon, description) VALUES
(3, 50, 1, '3-Day Streak', '🔥', 'You''re on fire! 3 days in a row!'),
(7, 100, 1, 'Week Warrior', '⭐', 'A whole week of showing up!'),
(14, 200, 2, 'Two Week Champion', '🏆', 'Two weeks strong!'),
(30, 500, 3, 'Monthly Master', '👑', 'A full month of dedication!'),
(60, 1000, 5, 'Two Month Legend', '💎', 'Two months of consistency!'),
(90, 2000, 10, 'Quarterly Superstar', '🌟', 'Three months! You''re unstoppable!');

-- Insert default mood messages
INSERT INTO public.mood_messages (mood_emoji, mood_label, message) VALUES
('😊', 'Happy', 'That''s wonderful! Your joy is contagious. Keep spreading those good vibes!'),
('😊', 'Happy', 'Happiness looks great on you! What a beautiful way to start the day!'),
('😢', 'Sad', 'It''s okay to feel sad sometimes. Remember, tomorrow is a fresh start. You''re not alone! 💙'),
('😢', 'Sad', 'Sending you a big virtual hug! Better days are coming, we promise!'),
('😠', 'Angry', 'Take a deep breath. It''s okay to feel angry. Maybe try counting to 10 or taking a short walk?'),
('😠', 'Angry', 'Your feelings are valid. Let it out, then let it go. You''ve got this!'),
('😰', 'Anxious', 'Deep breaths! You are safe. You are capable. One step at a time. 🌸'),
('😰', 'Anxious', 'It''s okay to feel worried. Try focusing on just one thing you can control right now.'),
('😴', 'Tired', 'Rest is important! Be gentle with yourself today. Maybe a cozy break is in order?'),
('😴', 'Tired', 'Even superheroes need rest days! Take it easy and recharge those batteries.'),
('🤩', 'Excited', 'That energy is amazing! Channel that excitement into something fun today!'),
('🤩', 'Excited', 'Your enthusiasm is inspiring! What adventure awaits?'),
('😐', 'Neutral', 'A calm day is a good day! Sometimes peaceful is perfect.'),
('😐', 'Neutral', 'Steady and balanced - that''s a great place to be!'),
('🥰', 'Loved', 'You ARE loved! And you deserve every bit of it!'),
('🥰', 'Loved', 'That warm feeling is special. Cherish it and share it!');

-- Enable realtime for mood entries and streaks
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_fortune_posts;