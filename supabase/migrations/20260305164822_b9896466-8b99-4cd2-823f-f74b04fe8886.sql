-- Revert: Remove the approval_status check from moderation trigger
-- The trigger should fire whenever is_moderated = false (meaning AI flagged it)
-- Fortune comments now properly run AI moderation before insert
CREATE OR REPLACE FUNCTION notify_on_moderation_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moderator_record RECORD;
  item_type TEXT;
  item_title TEXT;
BEGIN
  -- Determine item type and title
  IF TG_TABLE_NAME = 'discussion_posts' THEN
    item_type := 'Discussion Post';
    item_title := NEW.title;
  ELSIF TG_TABLE_NAME = 'discussion_comments' THEN
    item_type := 'Comment';
    item_title := 'Comment on discussion';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Notify moderators and admins
  FOR moderator_record IN
    SELECT DISTINCT user_id
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'owner')
    UNION
    SELECT DISTINCT user_id
    FROM user_permissions
    WHERE permission_type = 'moderate'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      moderator_record.user_id,
      'moderation_needed',
      'Content Needs Moderation',
      item_type || ' needs review: ' || item_title,
      '/moderation',
      jsonb_build_object(
        'item_id', NEW.id,
        'item_type', TG_TABLE_NAME
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;