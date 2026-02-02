-- Fix picture_password_notifications RLS - restrict INSERT to own user_id
DROP POLICY IF EXISTS "Users can insert their own notifications" ON picture_password_notifications;
CREATE POLICY "Users can insert their own notifications"
ON picture_password_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix wordle_user_stats RLS - restrict all write operations to own records
DROP POLICY IF EXISTS "Users can manage their own wordle stats" ON wordle_user_stats;

-- Create separate policies for each operation
CREATE POLICY "Users can insert their own wordle stats"
ON wordle_user_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wordle stats"
ON wordle_user_stats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wordle stats"
ON wordle_user_stats
FOR DELETE
USING (auth.uid() = user_id);