
-- Update vendor application notification trigger with specific tab
CREATE OR REPLACE FUNCTION notify_on_vendor_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins/owners about new vendor applications
  FOR admin_record IN
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'owner')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      admin_record.user_id,
      'vendor_application',
      'New Vendor Application',
      NEW.business_name || ' has applied to become a vendor',
      '/admin?tab=vendors',
      jsonb_build_object(
        'vendor_id', NEW.id,
        'business_name', NEW.business_name
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update moderation notification trigger with specific link
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

-- Update existing vendor notifications to have correct link
UPDATE notifications
SET link = '/admin?tab=vendors'
WHERE type = 'vendor_application'
AND link = '/admin';
