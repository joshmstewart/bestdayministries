-- Delete all existing fake notifications
DELETE FROM notifications;

-- Create fake notifications only for Joshie S (user_id: ad688e57-6077-455b-853b-a0fd0b458c2e)
INSERT INTO notifications (user_id, type, title, message, link, is_read, metadata)
VALUES
  -- Moderation needed
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'moderation_needed', 'Content Needs Moderation', 'Discussion Post needs review: Important Community Update', '/moderation', false, '{"item_id": "test-1", "item_type": "discussion_posts"}'),
  
  -- Vendor application
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'vendor_application', 'New Vendor Application', 'Sweet Treats Bakery has applied to become a vendor', '/admin?tab=vendors', false, '{"vendor_id": "test-2", "business_name": "Sweet Treats Bakery"}'),
  
  -- Comment on post
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'comment_on_post', 'New comment on your post', 'Sarah commented on "Community Event This Weekend"', '/discussions?postId=test-3', false, '{"post_id": "test-3", "comment_id": "test-4", "commenter_id": "test-5"}'),
  
  -- Comment on thread
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'comment_on_thread', 'New comment on a discussion', 'Mike also commented on "Volunteer Opportunities"', '/discussions?postId=test-6', false, '{"post_id": "test-6", "comment_id": "test-7", "commenter_id": "test-8"}'),
  
  -- Pending approval (guardian)
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'pending_approval', 'Post Needs Approval', 'Your bestie Emma created a new post that needs approval', '/guardian-approvals', false, '{"post_id": "test-9", "bestie_id": "test-10"}'),
  
  -- Approval decision (approved)
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'approval_decision', 'Post Approved!', 'Your guardian approved your post "My Day at the Park"', '/discussions?postId=test-11', false, '{"post_id": "test-11", "status": "approved"}'),
  
  -- Approval decision (rejected)
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'approval_decision', 'Post Not Approved', 'Your guardian did not approve your post. Please review their feedback.', '/discussions', false, '{"post_id": "test-12", "status": "rejected", "reason": "Content needs revision"}'),
  
  -- New sponsor message
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'new_sponsor_message', 'New Message from Sponsor', 'You have a new message from your sponsor John', '/guardian-links', false, '{"message_id": "test-13", "sponsor_id": "test-14"}'),
  
  -- Message approved
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'message_approved', 'Message Approved', 'Your message to sponsors has been approved and sent', '/bestie-messages', false, '{"message_id": "test-15"}'),
  
  -- Message rejected
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'message_rejected', 'Message Not Approved', 'Your guardian did not approve your message to sponsors', '/bestie-messages', false, '{"message_id": "test-16", "reason": "Please revise the message"}'),
  
  -- New event
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'new_event', 'New Event: Summer Picnic', 'A new event has been added to the calendar', '/events?eventId=test-17', false, '{"event_id": "test-17", "event_title": "Summer Picnic"}'),
  
  -- Event update
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'event_update', 'Event Updated: Art Workshop', 'The Art Workshop event has been updated', '/events?eventId=test-18', false, '{"event_id": "test-18", "event_title": "Art Workshop"}'),
  
  -- New sponsorship
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'new_sponsorship', 'New Sponsorship', 'Lisa is now sponsoring you!', '/guardian-links', false, '{"sponsorship_id": "test-19", "sponsor_name": "Lisa"}'),
  
  -- Sponsorship update
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'sponsorship_update', 'Sponsorship Updated', 'Your sponsor increased their monthly donation', '/guardian-links', false, '{"sponsorship_id": "test-20"}'),
  
  -- Product update (admin broadcast)
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'product_update', 'New Feature: Video Messages!', 'You can now send video messages to your sponsors. Check it out!', '/bestie-messages', false, '{}'),
  
  -- One read notification for testing
  ('ad688e57-6077-455b-853b-a0fd0b458c2e', 'comment_on_post', 'New comment on your post', 'Alex commented on "Weekend Plans"', '/discussions?postId=test-21', true, '{"post_id": "test-21", "comment_id": "test-22", "commenter_id": "test-23"}');