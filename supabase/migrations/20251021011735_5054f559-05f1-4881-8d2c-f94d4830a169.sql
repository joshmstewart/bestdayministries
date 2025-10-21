-- Fix user_stickers RLS policies for sticker pack system
-- Users need to be able to INSERT and UPDATE their own stickers when they open packs

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own stickers" ON user_stickers;
DROP POLICY IF EXISTS "Users can update their own stickers" ON user_stickers;
DROP POLICY IF EXISTS "Admins can insert stickers" ON user_stickers;
DROP POLICY IF EXISTS "Admins can update stickers" ON user_stickers;

-- Allow users to insert their own stickers (when opening packs)
CREATE POLICY "Users can insert their own stickers"
ON user_stickers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own stickers (for incrementing quantity on duplicates)
CREATE POLICY "Users can update their own stickers"
ON user_stickers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to insert stickers for any user
CREATE POLICY "Admins can insert stickers"
ON user_stickers
FOR INSERT
WITH CHECK (has_admin_access(auth.uid()));

-- Allow admins to update any stickers
CREATE POLICY "Admins can update stickers"
ON user_stickers
FOR UPDATE
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));