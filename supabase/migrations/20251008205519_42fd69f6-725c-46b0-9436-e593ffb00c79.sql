-- Insert fake notifications for testing (will use the current authenticated user)
-- These are sample notifications of every type in the system

-- Get current user and insert various notification types
DO $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user (if running from a session context)
  -- For testing purposes, we'll insert for any user that exists
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;
  
  IF current_user_id IS NOT NULL THEN
    -- 1. Moderation Needed
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'moderation_needed',
      'Content Needs Moderation',
      'Discussion Post needs review: Understanding Community Guidelines',
      '/moderation',
      '{"item_type": "discussion_posts", "item_id": "test-123"}'::jsonb,
      false
    );
    
    -- 2. Vendor Application
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'vendor_application',
      'New Vendor Application',
      'Artisan Crafts Co. has applied to become a vendor',
      '/admin?tab=vendors',
      '{"vendor_id": "test-456", "business_name": "Artisan Crafts Co."}'::jsonb,
      false
    );
    
    -- 3. Comment on Post
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'comment_on_post',
      'New comment on your post',
      'Sarah Johnson commented on "Best Day Ever Event Photos"',
      '/discussions?postId=test-789',
      '{"post_id": "test-789", "comment_id": "test-012", "commenter_id": "test-345"}'::jsonb,
      false
    );
    
    -- 4. Comment on Thread
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'comment_on_thread',
      'New comment on a discussion',
      'Mike Chen also commented on "Planning Summer Activities"',
      '/discussions?postId=test-678',
      '{"post_id": "test-678", "comment_id": "test-901", "commenter_id": "test-234"}'::jsonb,
      false
    );
    
    -- 5. Pending Approval
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'pending_approval',
      'Content Pending Approval',
      'Your bestie has submitted a new post for approval',
      '/guardian-approvals',
      '{"content_type": "post", "content_id": "test-567"}'::jsonb,
      false
    );
    
    -- 6. Approval Decision (Approved)
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'approval_decision',
      'Content Approved',
      'Your post "Fun at the Park" has been approved',
      '/discussions?postId=test-890',
      '{"decision": "approved", "content_type": "post", "content_id": "test-890"}'::jsonb,
      false
    );
    
    -- 7. New Sponsor Message
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'new_sponsor_message',
      'New Message from Sponsor',
      'You have a new message from your sponsor Emily',
      '/bestie-messages',
      '{"message_id": "test-123", "sponsor_name": "Emily"}'::jsonb,
      false
    );
    
    -- 8. Message Approved
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'message_approved',
      'Message Approved',
      'Your message to sponsors has been approved and delivered',
      '/bestie-messages',
      '{"message_id": "test-456"}'::jsonb,
      false
    );
    
    -- 9. Message Rejected
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'message_rejected',
      'Message Needs Revision',
      'Your sponsor message needs some changes before it can be sent',
      '/bestie-messages',
      '{"message_id": "test-789", "reason": "Please add more detail"}'::jsonb,
      false
    );
    
    -- 10. New Event
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'new_event',
      'New Event: Summer Picnic',
      'A new event has been added to the calendar',
      '/events?eventId=test-012',
      '{"event_id": "test-012", "event_title": "Summer Picnic"}'::jsonb,
      false
    );
    
    -- 11. Event Update
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'event_update',
      'Event Updated',
      'The location for Movie Night has been changed',
      '/events?eventId=test-345',
      '{"event_id": "test-345", "event_title": "Movie Night"}'::jsonb,
      false
    );
    
    -- 12. New Sponsorship
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'new_sponsorship',
      'New Sponsorship',
      'Thank you! You are now sponsoring Alex',
      '/guardian-links',
      '{"sponsorship_id": "test-678", "bestie_name": "Alex"}'::jsonb,
      false
    );
    
    -- 13. Sponsorship Update
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'sponsorship_update',
      'Sponsorship Updated',
      'Your sponsorship amount has been updated to $50/month',
      '/guardian-links',
      '{"sponsorship_id": "test-901", "new_amount": 50}'::jsonb,
      false
    );
    
    -- 14. Product Update (Admin Broadcast)
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'product_update',
      'New Features Available',
      'Check out our new photo albums feature in the gallery!',
      '/gallery',
      '{"feature": "albums", "priority": "high"}'::jsonb,
      false
    );
    
    -- Add one read notification for testing
    INSERT INTO notifications (user_id, type, title, message, link, metadata, is_read)
    VALUES (
      current_user_id,
      'comment_on_post',
      'Comment Replied',
      'Someone replied to your comment',
      '/discussions',
      '{"post_id": "old-123"}'::jsonb,
      true
    );
    
  END IF;
END $$;