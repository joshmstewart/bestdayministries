# NOTIFICATION SYSTEM - COMPLETE DOCUMENTATION

## SYSTEM OVERVIEW

Complete notification system with dual-channel delivery (in-app + email), user preferences, realtime updates, **grouped notifications UI**, rate limiting, automatic expiry, and comprehensive triggers for all major events.

---

## CORE COMPONENTS

### 1. Database Tables

**notifications**
- `id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `metadata`, `created_at`, `expires_at` (30 days default)
- **RLS:** Users view/update/delete own, Admins create, System can create
- **Realtime:** Enabled via `supabase_realtime` publication with separate listeners for INSERT, UPDATE, and DELETE events for immediate badge updates
- **Cleanup:** Automatic deletion of expired notifications via `cleanup_expired_notifications()`

**rate_limits**
- `id`, `user_id`, `endpoint`, `window_start`, `request_count`, `created_at`
- **Purpose:** Prevent notification spam (1 notification per endpoint per hour)
- **Cleanup:** Automatic cleanup of old records via `cleanup_rate_limits()` (1 hour retention)
- **RLS:** Users view own limits only

**notification_preferences**
- All preference columns for email + in-app independently (boolean, default: true)
- **Email:** `email_on_pending_approval`, `email_on_approval_decision`, `email_on_new_sponsor_message`, `email_on_message_approved`, `email_on_message_rejected`, `email_on_new_event`, `email_on_event_update`, `email_on_new_sponsorship`, `email_on_sponsorship_update`, `email_on_comment_on_post`, `email_on_comment_on_thread`, `email_on_product_update`
- **In-App:** `inapp_on_pending_approval`, `inapp_on_approval_decision`, `inapp_on_new_sponsor_message`, `inapp_on_message_approved`, `inapp_on_message_rejected`, `inapp_on_new_event`, `inapp_on_event_update`, `inapp_on_new_sponsorship`, `inapp_on_sponsorship_update`, `inapp_on_comment_on_post`, `inapp_on_comment_on_thread`, `inapp_on_product_update`
- **Digest:** `digest_frequency` ('never', 'daily', 'weekly'), `last_digest_sent_at`
- **RLS:** Users manage their own preferences

**digest_emails_log**
- `id`, `user_id`, `recipient_email`, `frequency`, `notification_count`, `sent_at`, `status`, `error_message`, `metadata`
- **Purpose:** Track digest email delivery success/failure for audit and debugging
- **RLS:** Users view own logs, Admins view all
- **Status:** 'sent' or 'failed' with error details

**email_notifications_log**
- `id`, `user_id`, `recipient_email`, `notification_type`, `subject`, `status`, `error_message`, `metadata`, `sent_at`
- **Purpose:** Track email delivery success/failure for audit and debugging
- **RLS:** Users view own logs, Admins view all
- **Status:** 'sent' or 'failed' with error details

### 2. Database Functions

**get_notification_preferences(_user_id)**
- Returns all preference flags for a user
- Defaults to `true` for all preferences if none exist
- Used by email sending logic and triggers to respect user choices

**get_users_needing_digest(_frequency)**
- Returns users who have unread notifications and are due for a digest email
- Checks `digest_frequency` preference and `last_digest_sent_at` timestamp
- For daily: Returns users who haven't received a digest in 23+ hours
- For weekly: Returns users who haven't received a digest in 6+ days, 23+ hours
- Returns: `user_id`, `user_email`, `unread_count`

**check_notification_rate_limit(_user_id, _endpoint, _max_requests, _window_minutes)**
- Prevents notification spam by limiting frequency
- Default: 1 notification per endpoint per hour
- Returns `true` if allowed, `false` if limit exceeded
- Auto-creates/updates rate limit records

**cleanup_rate_limits()**
- Deletes rate limit records older than 1 hour
- Run via scheduled job or maintenance script

**cleanup_expired_notifications()**
- Deletes notifications older than their `expires_at` date
- Run via scheduled job (daily recommended)

### 3. Database Triggers

**notify_on_new_comment()**
- **Fires:** AFTER INSERT on `discussion_comments`
- **Recipients:** Post author (if not commenter) + other commenters on thread
- **Types:** `comment_on_post` (author), `comment_on_thread` (other commenters)
- **Rate Limited:** Yes (1/hour per recipient per post)
- **Creates:** In-app notification with link to discussion

**notify_on_pending_post_approval()**
- **Fires:** AFTER INSERT on `discussion_posts` (when `approval_status = 'pending_approval'`)
- **Recipients:** All guardians linked to post author (via `caregiver_bestie_links`)
- **Type:** `pending_approval`
- **Checks:** `require_post_approval` flag on guardian link
- **Rate Limited:** Yes (1/hour per guardian per bestie)
- **Creates:** In-app notification + optional email

**notify_on_post_approval_decision()**
- **Fires:** AFTER UPDATE on `discussion_posts` (when `approval_status` changes)
- **Recipients:** Post author
- **Types:** `approval_decision` (approved/rejected)
- **Rate Limited:** Yes (1/hour per author per post)
- **Creates:** In-app notification with link to post

**notify_on_new_sponsor_message()**
- **Fires:** AFTER INSERT on `sponsor_messages` (when `status = 'approved'`)
- **Recipients:** All sponsors of the bestie (from `sponsorships`)
- **Type:** `new_sponsor_message`
- **Rate Limited:** Yes (1/hour per sponsor per bestie)
- **Creates:** In-app notification with link to sponsor inbox

**notify_on_message_status_change()**
- **Fires:** AFTER UPDATE on `sponsor_messages` (when `status` changes)
- **Recipients:** Message author (bestie)
- **Types:** `message_approved` or `message_rejected`
- **Rate Limited:** Yes (1/hour per bestie per message)
- **Creates:** In-app notification with rejection reason if applicable

**notify_on_new_sponsorship()**
- **Fires:** AFTER INSERT on `sponsorships` (when `status = 'active'`)
- **Recipients:** Sponsored bestie
- **Type:** `new_sponsorship`
- **Rate Limited:** Yes (1/hour per bestie)
- **Creates:** In-app notification with link to guardian-links page

**notify_on_new_event()** *(Added Jan 2026)*
- **Fires:** AFTER INSERT on `events` (when `is_public = true` AND `is_active = true`)
- **Recipients:** All users except event creator
- **Type:** `new_event`
- **Checks:** User's `inapp_on_new_event` preference (defaults to true)
- **Email:** Queues to `event_email_queue` if user has `email_on_new_event = true`
- **Creates:** In-app notification with link to `/community?eventId={id}`
- **Email Processing:** Triggered via `process-event-email-queue` edge function after event creation

### 4. Edge Functions

**send-notification-email** (`supabase/functions/send-notification-email/index.ts`)
- **Auth:** Public (receives structured notification data)
- **Request:** `{userId, notificationType, subject, title, message, link?, metadata?}`
- **Flow:**
  1. Fetch user profile and email from `profiles`
  2. Check notification preferences via `get_notification_preferences()`
  3. Skip email if user disabled that notification type
  4. Build HTML email with app logo, title, message, action button
  5. Send via Resend API
  6. Log result to `email_notifications_log` (success/failure)
- **Response:** `{success, emailId}` or `{success, skipped, reason}`
- **Error Handling:** Logs failures, returns error details

**send-digest-email** (`supabase/functions/send-digest-email/index.ts`)
- **Auth:** Public (typically called via cron job)
- **Request:** `{frequency: 'daily' | 'weekly'}`
- **Flow:**
  1. Call `get_users_needing_digest()` to find users with unread notifications
  2. For each user:
     - Fetch their unread notifications (up to 50 most recent)
     - Group by notification type
     - Build HTML digest email with all notifications
     - Send via Resend API
     - Update `last_digest_sent_at` timestamp
     - Log to `digest_emails_log`
  3. Return summary: processed, successful, failed counts
- **Response:** `{success, processed, successful, failed}`
- **Error Handling:** Logs individual failures, continues processing others

**broadcast-product-update** (`supabase/functions/broadcast-product-update/index.ts`)
- **Auth:** Requires admin/owner role
- **Request:** `{title, message, link?, targetRoles?}`
- **Flow:**
  1. Verify admin/owner authorization
  2. Fetch users (filtered by roles if specified)
  3. Create `product_update` notifications for each user
  4. Invoke `send-notification-email` for each user (async, non-blocking)
  5. Return summary: notifications created, emails sent/failed
- **Response:** `{notificationsSent, emailsSent, emailsFailed}`
- **Purpose:** Admin broadcasts platform updates to users

### 5. Frontend Components

**NotificationBell** (`src/components/NotificationBell.tsx`)
- **Location:** UnifiedHeader, before profile dropdown menu
- **Badge:** Red count (9+ shows "9+")
- **Popover:** Opens NotificationList on click
- **Accessibility:** ARIA label with count

**NotificationList** (`src/components/NotificationList.tsx`)
- **Location:** NotificationBell popover
- **Layout:** Scrollable list (400px height)
- **Grouping:** Similar notifications collapsed with count badge
- **Display:** 
  - Single notification: Icon, title, message, timestamp
  - Grouped (2+): Title with count, expandable to show all
- **Unread:** Primary background + blue dot indicator
- **Actions:**
  - Click notification → Navigate to link + mark as read
  - Click group → Expand to see all notifications
  - Hover individual → Show delete button (X)
  - Header: "Mark all read" button
- **Empty state:** Bell icon + "No notifications yet"
- **Features:** Collapsible groups, individual delete within groups
- **Grouping Logic:** Groups by type + target (same post_id, event_id, etc.)

### 6. Custom Hooks

**useNotifications** (`src/hooks/useNotifications.ts`)
- **State:** `notifications[]`, `groupedNotifications[]`, `unreadCount`, `loading`
- **Grouping Logic:**
  - Groups similar notifications by type + target (post_id, event_id, etc.)
  - `comment_on_post` + same post_id → "3 people commented on your post"
  - `pending_approval` + same item → "5 items need approval"
  - Single notifications remain ungrouped
- **Methods:**
  - `markAsRead(id)` - Mark single notification as read
  - `markAllAsRead()` - Mark all user's notifications as read
  - `deleteNotification(id)` - Delete single notification (with toast)
  - `deleteAllRead()` - Delete all read notifications (with toast)
  - `handleNotificationClick(notification)` - Mark read + navigate to link
  - `refreshNotifications()` - Manual reload
- **Realtime:** Subscribes to INSERT, UPDATE, and DELETE events on `notifications` table for immediate badge updates
  - Separate listeners for each event type ensure deleted notifications immediately update counts
  - Auto-refreshes on any database change
  - Handles auth state changes (SIGNED_IN, SIGNED_OUT)
- **Performance:** Fetches all notifications once, groups client-side
- **Realtime:** Subscribes to `notifications` table changes (INSERT/UPDATE/DELETE)
- **Auth:** Auto-refreshes on sign in/out, clears state on sign out
- **Cleanup:** Unsubscribes from channels on unmount

---

## GROUPED NOTIFICATIONS FEATURE

### How It Works
Notifications with the same type and target are automatically grouped in the UI:

**Grouping Rules:**
- `comment_on_post` + same `post_id` → Group all comments on same post
- `comment_on_thread` + same `post_id` → Group all thread comments
- `pending_approval` + same item → Group all approval requests
- `new_sponsor_message` + same `bestie_id` → Group messages from same bestie
- `moderation_needed` + same `item_id` → Group moderation items
- Other types remain ungrouped (each shown individually)

**UI Behavior:**
- **Single notification:** Shows normally with title, message, timestamp
- **Group (2+):** Shows count badge, condensed title (e.g., "3 people commented")
- **Expand:** Click chevron to see all notifications in group
- **Actions:** Can delete individual notifications within groups
- **Read Status:** Group marked read when all notifications are read
- **Realtime:** Groups update automatically as new notifications arrive

**Benefits:**
- Reduces visual clutter (3 items → 1 group)
- Easier to scan for distinct events
- Better mobile experience with less scrolling
- Modern UX pattern users expect

---

## RATE LIMITING & SPAM PREVENTION

### How It Works
1. **Check:** Before creating notification, call `check_notification_rate_limit(user_id, endpoint, max_requests, window_minutes)`
2. **Track:** Function creates/updates record in `rate_limits` table with window start (rounded to interval)
3. **Enforce:** Returns `false` if limit exceeded, preventing notification creation
4. **Cleanup:** Old records (>1 hour) deleted by `cleanup_rate_limits()` function

### Default Limits
- **Frequency:** 1 notification per endpoint per user per hour
- **Window:** 60 minutes (sliding window based on rounded timestamps)
- **Endpoints:** Identified by trigger name (e.g., 'post_approval', 'new_message')

### Implementation Pattern
```sql
-- In trigger function
IF NOT check_notification_rate_limit(_recipient_id, 'endpoint_name', 1, 60) THEN
  RETURN NEW; -- Skip notification creation
END IF;

-- Proceed with INSERT INTO notifications...
```

---

## NOTIFICATION EXPIRY

### Configuration
- **Default TTL:** 30 days from creation (`expires_at = now() + interval '30 days'`)
- **Cleanup:** Run `cleanup_expired_notifications()` daily via cron or maintenance script
- **Purpose:** Prevent database bloat, maintain performance

### Expiry Strategy
- Old notifications soft-deleted (remain in table until cleanup runs)
- Users can still delete manually before expiry
- Expired notifications excluded from queries automatically

## DIGEST EMAIL SYSTEM

### Overview
Users can opt to receive periodic digest emails (daily or weekly) instead of individual notification emails. Digests summarize all unread notifications grouped by type.

### Configuration
- **User Setting:** `notification_preferences.digest_frequency` ('never', 'daily', 'weekly')
- **Tracking:** `notification_preferences.last_digest_sent_at` (timestamp of last digest sent)
- **Schedule:** Should be run via cron job (see Scheduling section below)

### Digest Content
- **Grouping:** Notifications grouped by type (Pending Approvals, Comments, Messages, etc.)
- **Limit:** Up to 50 most recent unread notifications per user
- **Format:** HTML email with branded header, grouped sections, and "View All" button
- **Email Subject:** "Your [Daily/Weekly] Notification Digest - X unread notifications"

### Scheduling (Recommended)
```sql
-- Daily digests (run at 8 AM daily)
SELECT cron.schedule(
  'send-daily-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-digest-email',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"frequency": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly digests (run at 8 AM every Monday)
SELECT cron.schedule(
  'send-weekly-digest',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url:='https://nbvijawmjkycyweioglk.supabase.co/functions/v1/send-digest-email',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"frequency": "weekly"}'::jsonb
  ) as request_id;
  $$
);
```

### Digest vs Individual Emails
- When digest is enabled, users receive **NO individual notification emails**
- In-app notifications still appear immediately regardless of digest setting
- Digest emails include ALL unread notifications since last digest
- Individual email preferences are ignored when digest is enabled

### User Experience
1. **Settings Page:** Users select digest frequency (Never, Daily, Weekly)
2. **First Digest:** Sent at next scheduled time if user has unread notifications
3. **Subsequent Digests:** Only sent if user has new unread notifications since last digest
4. **Opt-Out:** Users can switch back to individual emails or disable all emails

### Monitoring
- **Digest Logs:** Check `digest_emails_log` for delivery status
- **User Activity:** Query `last_digest_sent_at` to see when users last received digests
- **Audit Trail:** All digest sends logged with notification count and status

---

### 1. Receiving Notifications

**In-App:**
1. Bell icon shows unread count (updates realtime)
2. Click bell → Popover opens with list
3. Click notification → Navigate to link, mark as read
4. Hover notification → Delete button appears
5. Real-time updates (new notifications appear instantly)

**Email:**
1. System checks user preferences for notification type
2. If enabled AND rate limit not exceeded, sends email via Resend
3. Email includes: Logo, title, message, action button
4. Footer: Link to manage preferences
5. Logs delivery status (sent/failed) for admin review

### 2. Managing Notifications

**In Notification List:**
- **Individual Delete:** Hover → Click X button
- **Bulk Clear:** Click "Clear read" button in header
- **Mark All Read:** Click "Mark all read" button in header
- Toast confirmations for all actions

**Settings Page** (`/profile` → Notification Preferences card)
- Toggle individual notification types (email + in-app independently)
- Sections: Approval & Moderation, Sponsorships, Community, Events
- Changes saved immediately to `notification_preferences` table
- Defaults to all enabled if no preferences exist
- Clear instructions for each notification type

---

## NOTIFICATION TYPES

| Type | Trigger | Recipients | Link | Email Pref | In-App Pref | Rate Limited |
|------|---------|------------|------|------------|-------------|--------------|
| `pending_approval` | Post/comment needs approval | Guardian(s) | `/guardian-approvals` | `email_on_pending_approval` | `inapp_on_pending_approval` | ✅ 1/hr |
| `approval_decision` | Post/comment approved/rejected | Post author | `/discussions?postId=xxx` | `email_on_approval_decision` | `inapp_on_approval_decision` | ✅ 1/hr |
| `new_sponsor_message` | Bestie sends message | Sponsor(s) | `/guardian-links` | `email_on_new_sponsor_message` | `inapp_on_new_sponsor_message` | ✅ 1/hr |
| `message_approved` | Message approved by guardian | Bestie | `/bestie-messages` | `email_on_message_approved` | `inapp_on_message_approved` | ✅ 1/hr |
| `message_rejected` | Message rejected by guardian | Bestie | `/bestie-messages` | `email_on_message_rejected` | `inapp_on_message_rejected` | ✅ 1/hr |
| `new_sponsorship` | New sponsorship created | Bestie | `/guardian-links` | `email_on_new_sponsorship` | `inapp_on_new_sponsorship` | ✅ 1/hr |
| `sponsorship_update` | Sponsorship modified/cancelled | Sponsor + Bestie | `/guardian-links` | `email_on_sponsorship_update` | `inapp_on_sponsorship_update` | ✅ 1/hr |
| `new_event` | Event created | All users | `/events?eventId=xxx` | `email_on_new_event` | `inapp_on_new_event` | ✅ 1/hr |
| `event_update` | Event modified | Attendees | `/events?eventId=xxx` | `email_on_event_update` | `inapp_on_event_update` | ✅ 1/hr |
| `comment_on_post` | New comment on user's post | Post author | `/discussions?postId=xxx` | `email_on_comment_on_post` | `inapp_on_comment_on_post` | ✅ 1/hr |
| `comment_on_thread` | New comment on thread user participated in | Other commenters | `/discussions?postId=xxx` | `email_on_comment_on_thread` | `inapp_on_comment_on_thread` | ✅ 1/hr |
| `product_update` | Admin broadcasts platform update | All users or specific roles | Custom link | `email_on_product_update` | `inapp_on_product_update` | ❌ No |

---

## TECHNICAL IMPLEMENTATION

### Complete Notification Flow
1. **Rate Check:** Trigger calls `check_notification_rate_limit()` → Skip if exceeded
2. **In-App:** Trigger creates record in `notifications` table with `expires_at`
3. **Preference Check:** Trigger calls `get_notification_preferences()` for recipient
4. **Email (if enabled):** Trigger invokes `send-notification-email` edge function
5. **Email Send:** Edge function sends via Resend, logs to `email_notifications_log`
6. **Realtime:** Frontend `useNotifications` hook receives update via subscription
7. **Display:** NotificationBell badge updates, list shows new notification
8. **User Action:** Click notification → Mark read, navigate to link
9. **Cleanup:** Expired notifications deleted by scheduled `cleanup_expired_notifications()`

### Database Subscription Pattern
```typescript
useEffect(() => {
  loadNotifications();

  // Auth subscription
  const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') loadNotifications();
    else if (event === 'SIGNED_OUT') { setNotifications([]); setUnreadCount(0); }
  });

  // Realtime subscription
  const channel = supabase
    .channel('notifications-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, 
      () => loadNotifications()
    )
    .subscribe();

  return () => {
    authSub.unsubscribe();
    supabase.removeChannel(channel);
  };
}, []);
```

---

## MAINTENANCE & MONITORING

### Scheduled Jobs (Recommended)
```sql
-- Run daily to clean up expired notifications
SELECT cleanup_expired_notifications();

-- Run hourly to clean up rate limit records
SELECT cleanup_rate_limits();
```

### Monitoring Queries
```sql
-- Check email delivery success rate
SELECT 
  notification_type,
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY notification_type), 2) as percentage
FROM email_notifications_log
WHERE sent_at > now() - interval '7 days'
GROUP BY notification_type, status;

-- Find users hitting rate limits
SELECT user_id, endpoint, request_count, window_start
FROM rate_limits
WHERE request_count >= 1
ORDER BY request_count DESC, window_start DESC;

-- Check notification expiry stats
SELECT 
  COUNT(*) FILTER (WHERE expires_at < now()) as expired,
  COUNT(*) FILTER (WHERE expires_at >= now()) as active,
  AVG(EXTRACT(epoch FROM (expires_at - created_at)) / 86400) as avg_ttl_days
FROM notifications;
```

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| Notifications not appearing | Realtime not enabled | Check `supabase_realtime` publication includes `notifications` |
| Email not sending | Preferences disabled | Check `notification_preferences` for user |
| Email sending but not received | RESEND_API_KEY invalid | Verify secret in edge function logs |
| Too many notifications | Rate limiting disabled | Verify `check_notification_rate_limit()` calls in triggers |
| Count doesn't update | Subscription not active | Check browser console for subscription errors |
| Bell not showing | User not authenticated | Bell only shows for logged-in users |
| Delete not working | RLS policy missing | Verify users can DELETE from `notifications` where `user_id = auth.uid()` |
| Notifications piling up | Cleanup not running | Schedule `cleanup_expired_notifications()` function |

---

## SECURITY CONSIDERATIONS

1. **RLS Policies:** Users can only view/modify their own notifications
2. **Rate Limiting:** Prevents spam and database bloat
3. **Email Validation:** Edge function validates user exists before sending
4. **Preference Enforcement:** Respects user opt-outs at database level
5. **Audit Trail:** All email sends logged with status/errors
6. **Expiry:** Old notifications auto-deleted to prevent data accumulation

---

## PRODUCT UPDATE BROADCASTS

**Location:** Admin → Product Updates

### Overview
Admins can broadcast platform announcements to all users or specific roles via in-app notifications and email.

### Admin Component
**ProductUpdateBroadcaster** (`src/components/admin/ProductUpdateBroadcaster.tsx`)
- **Location:** Admin panel → Product Updates tab
- **Interface:**
  - Title input (required, max 100 chars)
  - Message textarea (required, max 500 chars)
  - Optional link input
  - Role selector (checkboxes for targeting)
- **Action:** "Send Update" button → calls `broadcast-product-update` edge function
- **Feedback:** Toast on success/failure + summary (X notifications, Y emails sent, Z failed)

### Edge Function
**broadcast-product-update** (`supabase/functions/broadcast-product-update/index.ts`)
- **Auth:** Requires admin/owner role
- **Request:** `{title, message, link?, targetRoles?}`
- **Flow:**
  1. Verify admin/owner authorization
  2. Fetch users (filtered by roles if specified)
  3. Create `product_update` notifications for each user
  4. Invoke `send-notification-email` for each user (async, respects preferences)
  5. Return summary: notifications created, emails sent/failed
- **Response:** `{notificationsSent, emailsSent, emailsFailed}`

### User Preferences
- `email_on_product_update` (default: true)
- `inapp_on_product_update` (default: true)
- Controllable via Settings → Notifications

### Features
- **Role Targeting:** Send to specific roles (bestie, caregiver, supporter, admin, owner, vendor) or all users
- **Custom Links:** Optional action button in notification (e.g., link to blog post, new feature)
- **Async Processing:** Email sending doesn't block response, failures logged but don't halt broadcast
- **Audit Trail:** All notifications logged to `notifications` table, emails to `email_notifications_log`

### Use Cases
- New feature announcements
- Platform maintenance notices
- Policy updates
- Community highlights
- Event reminders

### Future Enhancements
- [ ] Schedule broadcasts for future dates
- [ ] Notification templates for common updates
- [ ] Attachment support (images, files)
- [ ] Analytics (open rates, click-through rates)
- [ ] Preview before sending
- [ ] Draft saving

---

## FUTURE ENHANCEMENTS

- [x] ~~Push notifications (web push API for desktop/mobile browsers)~~ **NOT PLANNED**
- [x] ~~Notification grouping (e.g., "5 new comments on your post")~~ **COULD IMPLEMENT**
- [x] ~~Digest emails (daily/weekly summaries of activity)~~ ✅ **DONE**
- [ ] Snooze functionality (dismiss temporarily, re-appear later)
- [ ] Custom notification sounds per type
- [ ] Rich notifications (inline images, action buttons)
- [ ] Notification history view (separate page with filters)
- [ ] Export notification data (CSV download)
- [ ] Admin notification broadcasting (send to all users)
- [ ] Mobile app notifications (when mobile app exists)

---

## KEY FILES

**Components:**
- `src/components/NotificationBell.tsx` - Bell icon with badge
- `src/components/NotificationList.tsx` - Notification list UI with delete
- `src/components/UnifiedHeader.tsx` - Bell integration

**Hooks:**
- `src/hooks/useNotifications.ts` - Notification data management with delete

**Pages:**
- `src/pages/ProfileSettings.tsx` - Settings page with notification preferences

**Edge Functions:**
- `supabase/functions/send-notification-email/index.ts` - Email delivery

**Database:**
- Triggers: `notify_on_new_comment()`, `notify_on_pending_post_approval()`, `notify_on_post_approval_decision()`, `notify_on_new_sponsor_message()`, `notify_on_message_status_change()`, `notify_on_new_sponsorship()`
- Functions: `get_notification_preferences()`, `check_notification_rate_limit()`, `cleanup_rate_limits()`, `cleanup_expired_notifications()`

---

## HEADER CHANGES

### Profile Dropdown

**Location:** UnifiedHeader (far right)
- Moved profile button to far right of header
- Converted to dropdown menu using `DropdownMenu` component
- **Dropdown Contents:**
  - Settings (links to `/profile`)
  - Logout

### Page Name Change

**Before:** "Profile Settings" page
**After:** "Settings" page
- Updated page title in `ProfileSettings.tsx`
- Updated navigation label in header dropdown
- Maintains all existing functionality (profile, notification preferences, password change)

---

**Last Updated:** After implementing complete email delivery, rate limiting, expiry, delete functionality, and all major notification triggers
