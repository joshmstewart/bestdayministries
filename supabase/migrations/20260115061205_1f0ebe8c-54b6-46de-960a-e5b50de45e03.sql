-- Add is_user_created column to saved_jokes to distinguish user-created jokes from AI-generated ones
ALTER TABLE public.saved_jokes 
ADD COLUMN IF NOT EXISTS is_user_created boolean DEFAULT false;