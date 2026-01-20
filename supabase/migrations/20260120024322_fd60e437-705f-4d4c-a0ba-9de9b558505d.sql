-- Add column to profiles for feed badge preference and last seen tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_feed_badge BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS feed_last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_feed_last_seen ON public.profiles(feed_last_seen_at);

-- Update RLS policy to allow users to update their own feed tracking columns
-- (existing policies should already cover this since users can update their own profile)