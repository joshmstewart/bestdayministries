-- Create enum for moderation policy
CREATE TYPE moderation_policy AS ENUM ('all', 'flagged', 'none');

-- Drop old boolean columns and add new enum columns
ALTER TABLE moderation_settings
DROP COLUMN require_image_moderation,
DROP COLUMN require_video_moderation;

ALTER TABLE moderation_settings
ADD COLUMN sponsor_message_image_policy moderation_policy DEFAULT 'flagged',
ADD COLUMN sponsor_message_video_policy moderation_policy DEFAULT 'flagged',
ADD COLUMN discussion_post_image_policy moderation_policy DEFAULT 'flagged',
ADD COLUMN discussion_comment_image_policy moderation_policy DEFAULT 'flagged';