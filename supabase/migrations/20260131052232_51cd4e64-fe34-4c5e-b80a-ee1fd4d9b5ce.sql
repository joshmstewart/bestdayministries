-- Add homepage preference column to profiles
-- NULL means default behavior (redirect to /community)
-- 'vendor-dashboard' means redirect to vendor dashboard on login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_homepage TEXT DEFAULT NULL;