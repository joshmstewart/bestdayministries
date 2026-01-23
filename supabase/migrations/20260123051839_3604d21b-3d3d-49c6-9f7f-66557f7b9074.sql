-- Create user_app_preferences table to store which apps users want visible
CREATE TABLE public.user_app_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_apps TEXT[] DEFAULT '{}',
  app_order TEXT[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_app_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own preferences
CREATE POLICY "Users can view own app preferences" 
ON public.user_app_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app preferences" 
ON public.user_app_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app preferences" 
ON public.user_app_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_app_preferences_updated_at
BEFORE UPDATE ON public.user_app_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();