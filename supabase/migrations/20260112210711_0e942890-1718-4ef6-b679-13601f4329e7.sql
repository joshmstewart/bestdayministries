-- Create enum for chore recurrence types
CREATE TYPE public.chore_recurrence_type AS ENUM ('daily', 'weekly', 'every_x_days', 'every_x_weeks');

-- Create chores table
CREATE TABLE public.chores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bestie_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '✅',
    recurrence_type public.chore_recurrence_type NOT NULL DEFAULT 'daily',
    recurrence_value INTEGER DEFAULT 1,
    day_of_week INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chore completions table
CREATE TABLE public.chore_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(chore_id, completed_date)
);

-- Create daily completion rewards table
CREATE TABLE public.chore_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reward_type TEXT NOT NULL DEFAULT 'sticker_pack',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, reward_date)
);

-- Enable RLS
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_daily_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for chores
CREATE POLICY "Guardians can manage chores for linked besties"
ON public.chores
FOR ALL
TO authenticated
USING (
    public.is_guardian_of(auth.uid(), bestie_id)
    OR bestie_id = auth.uid()
    OR public.has_admin_access(auth.uid())
)
WITH CHECK (
    public.is_guardian_of(auth.uid(), bestie_id)
    OR public.has_admin_access(auth.uid())
);

-- RLS policies for chore completions
CREATE POLICY "Users can manage their own completions"
ON public.chore_completions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Guardians can view completions for linked besties"
ON public.chore_completions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chores c
        WHERE c.id = chore_completions.chore_id
        AND public.is_guardian_of(auth.uid(), c.bestie_id)
    )
    OR public.has_admin_access(auth.uid())
);

-- RLS policies for daily rewards
CREATE POLICY "Users can manage their own rewards"
ON public.chore_daily_rewards
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger for chores
CREATE TRIGGER update_chores_updated_at
    BEFORE UPDATE ON public.chores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_chores_bestie_id ON public.chores(bestie_id);
CREATE INDEX idx_chores_created_by ON public.chores(created_by);
CREATE INDEX idx_chore_completions_chore_id ON public.chore_completions(chore_id);
CREATE INDEX idx_chore_completions_user_id ON public.chore_completions(user_id);
CREATE INDEX idx_chore_completions_date ON public.chore_completions(completed_date);
CREATE INDEX idx_chore_daily_rewards_user_date ON public.chore_daily_rewards(user_id, reward_date);