-- Add unique constraint for feature_prompt notifications per user
CREATE UNIQUE INDEX idx_picture_password_notifications_feature_prompt_unique 
ON picture_password_notifications (user_id) 
WHERE notification_type = 'feature_prompt';