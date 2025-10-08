# NOTIFICATION SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
Dual notification system with in-app notifications (bell icon) and email notifications, providing real-time updates and user-configurable preferences for all platform activities.

---

## IN-APP NOTIFICATIONS

### Database

**notifications table**
- `id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `metadata` (jsonb), `created_at`
- **RLS:** Users view their own, admins can create, system can create
- **Realtime:** Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`

### Components

**NotificationBell** (`src/components/NotificationBell.tsx`)
- Location: UnifiedHeader (right side, before profile dropdown)
- Displays bell icon with red badge showing unread count
- Badge shows "9+" if count > 9
- Opens popover on click

**NotificationList** (`src/components/NotificationList.tsx`)
- Renders inside popover (max height: 400px, scrollable)
- Shows: Title, message, time ago (via `date-fns`)
- Visual indicators:
  - Unread: Blue dot + light background (`bg-primary/5`)
  - Read: No dot, normal background
- Actions:
  - Click notification → marks as read → navigates to `link`
  - "Mark all read" button in header

**useNotifications Hook** (`src/hooks/useNotifications.ts`)
- Returns: `{notifications, unreadCount, loading, markAsRead, markAllAsRead, handleNotificationClick, refreshNotifications}`
- Fetches 20 most recent notifications on load
- Real-time subscription updates count immediately
- Handles auth state changes (clears on sign out)

### Notification Types

**Current Types:**
- `comment_on_post` - Someone commented on your post
- `comment_on_thread` - Someone commented on a discussion you're in

**Metadata Structure:**
```json
{
  "post_id": "uuid",
  "comment_id": "uuid",
  "commenter_id": "uuid"
}
```

### Navigation Links
Format: `/discussions?postId={post_id}`
- Discussions page reads `postId` param from URL
- Scrolls to post, adds temporary highlight (ring-2 ring-primary)
- Highlight removed after 3 seconds

### Creating Notifications

**From Edge Functions:**
```typescript
await supabase
  .from("notifications")
  .insert({
    user_id: recipientId,
    type: "notification_type",
    title: "Notification Title",
    message: "Notification message text",
    link: "/path?param=value",
    metadata: { key: "value" }
  });
```

**From Database Triggers:**
```sql
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES (
  recipient_id,
  'notification_type',
  'Title',
  'Message',
  '/path?param=value',
  jsonb_build_object('key', 'value')
);
```

---

## NOTIFICATION PREFERENCES

### Database

**notification_preferences table**
- `id`, `user_id`, `created_at`, `updated_at`
- All email preference columns (boolean, default: true):
  - `email_on_pending_approval`
  - `email_on_approval_decision`
  - `email_on_new_sponsor_message`
  - `email_on_message_approved`
  - `email_on_message_rejected`
  - `email_on_new_event`
  - `email_on_event_update` (default: false)
  - `email_on_new_sponsorship`
  - `email_on_sponsorship_update`
  - `email_on_comment_on_post`
  - `email_on_comment_on_thread`
- All in-app preference columns (boolean, default: true):
  - `inapp_on_pending_approval`
  - `inapp_on_approval_decision`
  - `inapp_on_new_sponsor_message`
  - `inapp_on_message_approved`
  - `inapp_on_message_rejected`
  - `inapp_on_new_event`
  - `inapp_on_event_update` (default: false)
  - `inapp_on_new_sponsorship`
  - `inapp_on_sponsorship_update`
  - `inapp_on_comment_on_post`
  - `inapp_on_comment_on_thread`
- **RLS:** Users manage their own preferences

**email_notifications_log table**
- `id`, `user_id`, `notification_type`, `recipient_email`, `subject`, `sent_at`, `status`, `error_message`, `metadata`
- Tracks all sent emails for audit/debugging
- **RLS:** Users view their own logs, admins view all

### Preference UI

**Location:** `/profile` → Notification Preferences tab (in Settings page)

**Layout:**
- Two-column toggle system: "Email" and "In-App" headers
- Each notification type has independent toggles for both channels
- Users can enable/disable email, in-app, both, or neither for each type

**Sections (Conditionally Rendered):**

1. **Guardian & Admin** (caregivers, admins, owners only)
   - Pending approvals (email + in-app)
   - Approval decisions (email + in-app)

2. **Discussion Activity** (all authenticated users)
   - Comments on your posts (email + in-app)
   - Comments on discussions you're in (email + in-app)

3. **Sponsorship Messages**
   - New messages (sponsors only) (email + in-app)
   - Message approved/rejected (besties only) (email + in-app)

4. **Events** (all users)
   - New events (email + in-app)
   - Event updates (email + in-app)

5. **Sponsorships** (users being sponsored only)
   - New sponsorships (email + in-app)
   - Sponsorship updates (email + in-app)

### Database Function for Preferences

**get_notification_preferences(_user_id)**
```sql
CREATE OR REPLACE FUNCTION public.get_notification_preferences(_user_id uuid)
RETURNS TABLE(
  email_on_pending_approval boolean,
  email_on_approval_decision boolean,
  -- ... all email preference columns
  inapp_on_pending_approval boolean,
  inapp_on_approval_decision boolean,
  -- ... all in-app preference columns
) AS $$
  SELECT 
    COALESCE(np.email_on_pending_approval, true),
    COALESCE(np.email_on_approval_decision, true),
    -- ... all other email columns with COALESCE defaults
    COALESCE(np.inapp_on_pending_approval, true),
    COALESCE(np.inapp_on_approval_decision, true),
    -- ... all other in-app columns with COALESCE defaults
  FROM public.notification_preferences np
  WHERE np.user_id = _user_id
  UNION ALL
  SELECT true, true, ..., true, true, ... -- defaults for both email and in-app if no record exists
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = _user_id
  )
  LIMIT 1;
$$;
```

### Checking Preferences in Triggers

**Pattern:**
```sql
-- Check in-app notification preference
IF (SELECT COALESCE(inapp_on_notification_type, true) 
    FROM notification_preferences 
    WHERE user_id = target_user_id) THEN
  -- Create in-app notification
END IF;

-- Check email notification preference
IF (SELECT COALESCE(email_on_notification_type, true) 
    FROM notification_preferences 
    WHERE user_id = target_user_id) THEN
  -- Send email (if email notification exists for this type)
END IF;
```

---

## DATABASE TRIGGERS

### Comment Notifications

**Function:** `notify_on_new_comment()`
**Trigger:** `on_comment_created` (AFTER INSERT on `discussion_comments`)

**Logic:**
1. Get commenter's name from `profiles`
2. Get post author and title from `discussion_posts`
3. **Notify post author** (if not self-comment):
   - Check `email_on_approval_decision` preference
   - Create notification: "New comment on your post"
   - Type: `comment_on_post`
4. **Notify other commenters** (loop through distinct commenters):
   - Exclude: post author, current commenter
   - Check `email_on_approval_decision` preference
   - Create notification: "New comment on a discussion"
   - Type: `comment_on_thread`

**Metadata:**
```json
{
  "post_id": "uuid",
  "comment_id": "uuid",
  "commenter_id": "uuid"
}
```

---

## NOTIFICATION LIFECYCLE

### In-App Flow
1. Trigger/function creates notification record
2. Realtime subscription fires in `useNotifications`
3. Hook calls `loadNotifications()` to refresh
4. Unread count updates in bell badge
5. User clicks bell → sees notification list
6. User clicks notification:
   - `markAsRead()` updates `is_read = true`
   - `navigate(notification.link)` routes to content
   - Unread count decrements

### Email Flow (Future Implementation)
1. Trigger checks user's email preferences
2. If enabled, calls edge function to send email
3. Edge function logs to `email_notifications_log`
4. Email sent via Resend API
5. Status/errors logged for tracking

---

## REAL-TIME UPDATES

### Subscription Setup
```typescript
const channel = supabase
  .channel('notifications-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
    },
    (payload) => {
      loadNotifications(); // Refresh list
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

### Performance
- Only subscribes when user authenticated
- Loads most recent 20 notifications (prevents large queries)
- Auto-unsubscribes on auth sign out
- Cleans up on component unmount

---

## USER WORKFLOWS

### Receiving Notification
1. User posts/comments on discussion
2. Another user comments
3. Trigger creates notification
4. Bell badge updates immediately (realtime)
5. User clicks bell → sees new notification
6. User clicks notification → jumps to discussion post

### Managing Preferences
1. User navigates to `/profile` (Settings page) → Notification Preferences tab
2. Sees sections relevant to their role/relationships
3. Each notification type shows two toggles: Email and In-App
4. User can independently enable/disable each channel
5. Toggles switches on/off for desired notification channels
6. Preferences saved to database automatically
7. Future notifications respect these settings per channel

### Mark All Read
1. User clicks "Mark all read" button
2. Updates all unread notifications for user
3. Badge clears to 0
4. Toast confirms action

---

## EXTENSIBILITY

### Adding New Notification Types

**1. Create trigger/function:**
```sql
CREATE OR REPLACE FUNCTION notify_on_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    target_user,
    'new_notification_type',
    'Title',
    'Message',
    '/link',
    jsonb_build_object('key', 'value')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION notify_on_event();
```

**2. Add notification preferences (both email and in-app):**
```sql
ALTER TABLE notification_preferences
ADD COLUMN email_on_new_type boolean NOT NULL DEFAULT true,
ADD COLUMN inapp_on_new_type boolean NOT NULL DEFAULT true;
```

**3. Update database function:**
- Add new columns to `get_notification_preferences()` return type
- Add COALESCE defaults for new columns

**4. Update UI:**
- Add to `notificationPrefs` state in `ProfileSettings.tsx` (both email and in-app)
- Add two switches (Email + In-App) in appropriate section with role check
- Align with existing two-column layout

**4. Document notification type:**
- Add to "Notification Types" section above
- Document metadata structure
- Update email notification list

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| Badge not updating | Subscription not active | Check console for subscription errors |
| Notifications not appearing | RLS policy issue | Verify `auth.uid() = user_id` policy |
| Duplicate notifications | Multiple triggers | Check for duplicate trigger definitions |
| Navigation not working | Invalid link format | Ensure link matches route pattern |
| Preferences not saving | Missing record | System creates record on first save |
| Wrong section visibility | Role check failure | Verify `profile.role` and relationship queries |

---

## SECURITY CONSIDERATIONS

**RLS Policies:**
- Users can only view their own notifications
- Users can only update their own notifications (mark as read)
- Admins can create notifications for any user
- System can create notifications (via triggers with SECURITY DEFINER)

**Data Privacy:**
- Notification metadata stored as JSONB (flexible but typed in triggers)
- Email preferences default to TRUE (opt-out model)
- Users can disable all notification types
- Email log tracks all communications (GDPR compliance)

**Performance:**
- Limit notifications fetch to 20 (prevent large queries)
- Index on `user_id` + `created_at` (fast sorting)
- Index on `is_read` (fast unread counts)

---

## FUTURE ENHANCEMENTS

### Priority 1 - Email Integration
- [ ] Create edge functions to send actual emails
- [ ] Integrate with existing email system (Resend)
- [ ] Batch email notifications (daily digest option)
- [ ] Email templates for each notification type

### Priority 2 - Advanced Features
- [ ] Push notifications (PWA)
- [ ] Notification grouping (e.g., "3 new comments")
- [ ] Notification history page (view all, filter, search)
- [ ] Notification categories/priorities
- [ ] Mute specific threads/users

### Priority 3 - Analytics
- [ ] Track notification open rates
- [ ] A/B test notification copy
- [ ] User engagement metrics
- [ ] Notification delivery success rates

---

## KEY FILES

**Components:**
- `src/components/NotificationBell.tsx` - Bell icon with badge
- `src/components/NotificationList.tsx` - Notification list UI
- `src/components/UnifiedHeader.tsx` - Bell integration

**Hooks:**
- `src/hooks/useNotifications.ts` - Notification data management

**Pages:**
- `src/pages/ProfileSettings.tsx` - Settings page with notification preferences (dual email/in-app toggles)
- `src/pages/Discussions.tsx` - Post highlighting from notifications

**Database:**
- Migration: `[timestamp]_create_notifications_table.sql`
- Migration: `[timestamp]_add_discussion_notification_preferences.sql`
- Migration: `[timestamp]_add_inapp_notification_preferences.sql`
- Trigger: `notify_on_new_comment()`

---

## HEADER CHANGES

### Profile Dropdown

**Location:** UnifiedHeader (far right)
- Moved profile button to far right of header
- Converted to dropdown menu using `DropdownMenu` component
- **Dropdown Contents:**
  - Settings (links to `/profile`)
  - Logout
- All other navigation buttons remain as separate buttons (unchanged)

**Implementation:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <User className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => navigate("/profile")}>
      <Settings className="mr-2 h-4 w-4" />
      Settings
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

**Last Updated:** After implementing in-app notification preferences, renaming Profile Settings to Settings, and moving profile button to dropdown menu
