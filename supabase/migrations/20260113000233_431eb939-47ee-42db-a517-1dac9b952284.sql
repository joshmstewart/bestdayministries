-- Create emotion_journal_entries table
CREATE TABLE public.emotion_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emotion TEXT NOT NULL,
  emotion_emoji TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  journal_text TEXT,
  audio_url TEXT,
  triggers TEXT[],
  coping_strategies TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emotion types reference table (admin-configurable)
CREATE TABLE public.emotion_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  category TEXT NOT NULL DEFAULT 'neutral',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  coping_suggestions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emotion_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for emotion_journal_entries
CREATE POLICY "Users can view their own emotion entries"
  ON public.emotion_journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emotion entries"
  ON public.emotion_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotion entries"
  ON public.emotion_journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotion entries"
  ON public.emotion_journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for emotion_types (public read, admin write)
CREATE POLICY "Anyone can view active emotion types"
  ON public.emotion_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage emotion types"
  ON public.emotion_types FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- Insert default emotions
INSERT INTO public.emotion_types (name, emoji, color, category, display_order, coping_suggestions) VALUES
  ('Happy', '😊', '#22C55E', 'positive', 1, ARRAY['Share your joy with someone!', 'Write down what made you happy', 'Take a moment to appreciate this feeling']),
  ('Excited', '🤩', '#F59E0B', 'positive', 2, ARRAY['Channel the energy into something creative', 'Tell someone about what''s exciting', 'Celebrate this moment!']),
  ('Calm', '😌', '#06B6D4', 'positive', 3, ARRAY['Enjoy this peaceful moment', 'Take deep breaths', 'Practice gratitude']),
  ('Loved', '🥰', '#EC4899', 'positive', 4, ARRAY['Express love to someone you care about', 'Write about who or what makes you feel loved', 'Hug someone or something soft']),
  ('Proud', '😤', '#8B5CF6', 'positive', 5, ARRAY['Celebrate your achievement!', 'Share your success with someone', 'Write down what you accomplished']),
  ('Sad', '😢', '#3B82F6', 'negative', 6, ARRAY['Talk to someone you trust', 'It''s okay to cry', 'Watch a favorite show or movie', 'Hug a stuffed animal']),
  ('Angry', '😠', '#EF4444', 'negative', 7, ARRAY['Take deep breaths - count to 10', 'Go for a walk', 'Squeeze a stress ball', 'Talk about your feelings']),
  ('Scared', '😰', '#F97316', 'negative', 8, ARRAY['Find someone to be with', 'Deep breathing helps', 'Remember: you are safe', 'Hold something comforting']),
  ('Worried', '😟', '#A855F7', 'negative', 9, ARRAY['Talk to someone you trust', 'Write down your worries', 'Focus on what you can control', 'Try the 5-4-3-2-1 grounding technique']),
  ('Frustrated', '😤', '#DC2626', 'negative', 10, ARRAY['Take a break', 'Try again later', 'Ask for help', 'It''s okay to not be perfect']),
  ('Tired', '😴', '#6B7280', 'neutral', 11, ARRAY['Rest if you can', 'Take a short break', 'Drink some water', 'Stretch your body']),
  ('Confused', '😕', '#9CA3AF', 'neutral', 12, ARRAY['Ask questions - it''s okay not to know', 'Take it one step at a time', 'Ask someone to explain differently']),
  ('Lonely', '🥺', '#64748B', 'negative', 13, ARRAY['Reach out to a friend or family member', 'Join an activity or group', 'Remember: someone cares about you', 'Write a letter to someone']),
  ('Grateful', '🙏', '#10B981', 'positive', 14, ARRAY['Write down 3 things you''re thankful for', 'Tell someone thank you', 'Share your gratitude with others']);

-- Create updated_at trigger
CREATE TRIGGER update_emotion_journal_entries_updated_at
  BEFORE UPDATE ON public.emotion_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for emotion journal entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotion_journal_entries;