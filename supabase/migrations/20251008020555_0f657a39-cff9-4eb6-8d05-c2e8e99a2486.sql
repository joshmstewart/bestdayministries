-- Function to create notifications for new comments
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  commenter_name TEXT;
  commenter_id UUID;
  other_commenter RECORD;
BEGIN
  -- Get the commenter's ID and name
  commenter_id := NEW.author_id;
  SELECT display_name INTO commenter_name
  FROM profiles
  WHERE id = commenter_id;
  
  -- Get the post author and title
  SELECT author_id, title INTO post_author_id, post_title
  FROM discussion_posts
  WHERE id = NEW.post_id;
  
  -- Notify post author if they didn't comment on their own post
  IF post_author_id IS NOT NULL AND post_author_id != commenter_id THEN
    -- Check notification preferences
    IF (SELECT COALESCE(email_on_approval_decision, true) 
        FROM notification_preferences 
        WHERE user_id = post_author_id) THEN
      
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        post_author_id,
        'comment_on_post',
        'New comment on your post',
        commenter_name || ' commented on "' || post_title || '"',
        '/discussions?postId=' || NEW.post_id,
        jsonb_build_object(
          'post_id', NEW.post_id,
          'comment_id', NEW.id,
          'commenter_id', commenter_id
        )
      );
    END IF;
  END IF;
  
  -- Notify other commenters on the same post
  FOR other_commenter IN
    SELECT DISTINCT dc.author_id
    FROM discussion_comments dc
    WHERE dc.post_id = NEW.post_id
      AND dc.author_id != commenter_id
      AND dc.author_id != post_author_id
      AND dc.id != NEW.id
  LOOP
    -- Check notification preferences
    IF (SELECT COALESCE(email_on_approval_decision, true) 
        FROM notification_preferences 
        WHERE user_id = other_commenter.author_id) THEN
      
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        other_commenter.author_id,
        'comment_on_thread',
        'New comment on a discussion',
        commenter_name || ' also commented on "' || post_title || '"',
        '/discussions?postId=' || NEW.post_id,
        jsonb_build_object(
          'post_id', NEW.post_id,
          'comment_id', NEW.id,
          'commenter_id', commenter_id
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new comments
DROP TRIGGER IF EXISTS on_comment_created ON discussion_comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_comment();