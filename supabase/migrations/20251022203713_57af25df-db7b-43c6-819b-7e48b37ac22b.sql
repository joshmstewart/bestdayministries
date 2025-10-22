-- Fix donations table RLS policy that's causing permission errors
-- The "Donors can view their own donations by email" policy tries to query auth.users
-- which causes permission denied errors even for admins

-- Drop the problematic policy
DROP POLICY IF EXISTS "Donors can view their own donations by email" ON public.donations;

-- The remaining policies are sufficient:
-- 1. "Admins can view all donations" - for admin access
-- 2. "Donors can view their own donations by id" - for logged-in donors
-- 3. Guest donations are handled by the trigger that links them when users sign up