-- Priority 1: Fix RLS policies for discussion_posts to allow authenticated users to create pending posts

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Guardians and admins can create posts" ON discussion_posts;

-- Create new inclusive policy for authenticated users to create posts with pending_approval status
CREATE POLICY "Authenticated users can create posts pending approval"
ON discussion_posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id 
  AND approval_status = 'pending_approval'
);

-- Admins can still create approved posts directly (bypassing approval workflow)
CREATE POLICY "Admins can create approved posts"
ON discussion_posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id 
  AND has_admin_access(auth.uid())
  AND approval_status = 'approved'
);