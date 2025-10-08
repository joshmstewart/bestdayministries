-- Add auto_resolved column to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS auto_resolved boolean DEFAULT false;

-- Create function to auto-resolve notifications when actions complete
CREATE OR REPLACE FUNCTION auto_resolve_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  notification_type TEXT;
  item_id_value TEXT;
BEGIN
  -- Determine notification type based on table and action
  IF TG_TABLE_NAME = 'discussion_posts' THEN
    IF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending_approval' THEN
      notification_type := 'pending_approval';
      item_id_value := NEW.id::text;
      
      -- Mark related moderation_needed notifications as resolved
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'moderation_needed'
        AND metadata->>'item_id' = item_id_value
        AND metadata->>'item_type' = 'discussion_posts'
        AND is_read = false;
        
      -- Mark pending_approval notifications as resolved
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'pending_approval'
        AND metadata->>'post_id' = item_id_value
        AND is_read = false;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'discussion_comments' THEN
    IF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending_approval' THEN
      item_id_value := NEW.id::text;
      
      -- Mark related moderation_needed notifications as resolved
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'moderation_needed'
        AND metadata->>'item_id' = item_id_value
        AND metadata->>'item_type' = 'discussion_comments'
        AND is_read = false;
        
      -- Mark pending_approval notifications as resolved
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'pending_approval'
        AND metadata->>'comment_id' = item_id_value
        AND is_read = false;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'sponsor_messages' THEN
    IF NEW.status = 'approved' AND OLD.status = 'pending_approval' THEN
      item_id_value := NEW.id::text;
      
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'new_sponsor_message'
        AND metadata->>'message_id' = item_id_value
        AND is_read = false;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'vendors' THEN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
      item_id_value := NEW.id::text;
      
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE type = 'vendor_application'
        AND metadata->>'vendor_id' = item_id_value
        AND is_read = false;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'vendor_bestie_requests' THEN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
      item_id_value := NEW.id::text;
      
      UPDATE notifications
      SET is_read = true, auto_resolved = true
      WHERE metadata->>'vendor_request_id' = item_id_value
        AND is_read = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for auto-resolving notifications
DROP TRIGGER IF EXISTS auto_resolve_post_notifications ON discussion_posts;
CREATE TRIGGER auto_resolve_post_notifications
AFTER UPDATE ON discussion_posts
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_notification();

DROP TRIGGER IF EXISTS auto_resolve_comment_notifications ON discussion_comments;
CREATE TRIGGER auto_resolve_comment_notifications
AFTER UPDATE ON discussion_comments
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_notification();

DROP TRIGGER IF EXISTS auto_resolve_message_notifications ON sponsor_messages;
CREATE TRIGGER auto_resolve_message_notifications
AFTER UPDATE ON sponsor_messages
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_notification();

DROP TRIGGER IF EXISTS auto_resolve_vendor_notifications ON vendors;
CREATE TRIGGER auto_resolve_vendor_notifications
AFTER UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_notification();

DROP TRIGGER IF EXISTS auto_resolve_vendor_request_notifications ON vendor_bestie_requests;
CREATE TRIGGER auto_resolve_vendor_request_notifications
AFTER UPDATE ON vendor_bestie_requests
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_notification();