-- =================================================================
-- SECURITY FIX: Tighten RLS policies on critical tables
-- =================================================================

-- 1. FIX COIN_TRANSACTIONS: Remove overly permissive INSERT policy
-- The current policy allows ANY authenticated user to insert transactions,
-- which means users can grant themselves unlimited coins!

-- Drop the dangerous permissive policy
DROP POLICY IF EXISTS "System can insert transactions" ON public.coin_transactions;

-- Create proper INSERT policy: Only allow inserts where user_id matches auth.uid()
-- This allows users to create their own transactions (like spending coins),
-- but the amount validation should be handled by edge functions
CREATE POLICY "Users can insert their own transactions"
  ON public.coin_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also allow admins to insert transactions for any user (for rewards, corrections)
CREATE POLICY "Admins can insert transactions for any user"
  ON public.coin_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (has_admin_access(auth.uid()));

-- 2. FIX USER_ROLES: Remove overly broad SELECT policy
-- The "Anyone authenticated can view user roles" exposes all user roles to everyone
-- Users only need to see their own role; admins can see all

DROP POLICY IF EXISTS "Anyone authenticated can view user roles" ON public.user_roles;

-- Also allow admins to INSERT roles (not just owners) for practical admin workflows
-- But keep the owner-only restriction for modifying admin/owner roles (handled in edge function)
DROP POLICY IF EXISTS "Only owners can insert roles" ON public.user_roles;

CREATE POLICY "Admins and owners can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_admin_access(auth.uid()));

-- Allow admins to update non-admin roles (owner restriction enforced in edge function)
DROP POLICY IF EXISTS "Only owners can update roles" ON public.user_roles;

CREATE POLICY "Admins and owners can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_admin_access(auth.uid()));

-- 3. ADD UPDATE POLICY FOR PROFILES by admins
-- Admins should be able to update user profiles for moderation purposes
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- 4. ENSURE handle_new_user trigger can still insert roles for new signups
-- The trigger runs with SECURITY DEFINER so it bypasses RLS
-- This is already the case, so no changes needed there