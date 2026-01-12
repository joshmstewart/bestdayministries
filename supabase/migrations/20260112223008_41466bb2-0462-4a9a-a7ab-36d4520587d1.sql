-- Create chore_streaks table to track user streaks
CREATE TABLE public.chore_streaks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_completion_days INTEGER NOT NULL DEFAULT 0,
    last_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.chore_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own streaks" 
ON public.chore_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" 
ON public.chore_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" 
ON public.chore_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow guardians to view linked besties' streaks
CREATE POLICY "Guardians can view linked bestie streaks"
ON public.chore_streaks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregiver_bestie_links
        WHERE caregiver_id = auth.uid() AND bestie_id = user_id
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chore_streaks_updated_at
BEFORE UPDATE ON public.chore_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create badges table for chore achievements
CREATE TABLE public.chore_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    badge_icon TEXT NOT NULL DEFAULT '🏆',
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_type)
);

-- Enable Row Level Security
ALTER TABLE public.chore_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for badges
CREATE POLICY "Users can view their own badges" 
ON public.chore_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" 
ON public.chore_badges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow guardians to view linked besties' badges
CREATE POLICY "Guardians can view linked bestie badges"
ON public.chore_badges
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregiver_bestie_links
        WHERE caregiver_id = auth.uid() AND bestie_id = user_id
    )
);