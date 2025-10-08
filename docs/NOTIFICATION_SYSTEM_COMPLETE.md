# NOTIFICATION SYSTEM - COMPLETE DOCUMENTATION

## SYSTEM OVERVIEW

Complete notification system with dual-channel delivery (in-app + email), user preferences, realtime updates, rate limiting, automatic expiry, and comprehensive triggers for all major events.

---

## CORE COMPONENTS

### 1. Database Tables

**notifications**
- `id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `metadata`, `created_at`, `expires_at` (30 days default)
- **RLS:** Users view/update/delete own, Admins create, System can create
- **Realtime:** Enabled via `supabase_realtime` publication
- **Cleanup:** Automatic deletion of expired notifications via `cleanup_expired_notifications()`

**rate_limits**
- `id`, `user_id`, `endpoint`, `window_start`, `request_count`, `created_at`
- **Purpose:** Prevent notification spam (1 notification per endpoint per hour)
- **Cleanup:** Automatic cleanup of old records via `cleanup_rate_limits()` (1 hour retention)
- **RLS:** Users view own limits only

**notification_preferences**
- All preference columns for email + in-app independently (boolean, default: true)
- **Email:** `email_on_pending_approval`, `email_on_approval_decision`, `email_on_new_sponsor_message`, `email_on_message_approved`, `email_on_message_rejected`, `email_on_new_event`, `email_on_event_update`, `email_on_new_sponsorship`, `email_on_sponsorship_update`, `email_on_comment_on_post`, `email_on_comment_on_thread`
- **In-App:** `inapp_on_pending_approval`, `inapp_on_approval_decision`, `inapp_on_new_sponsor_message`, `inapp_on_message_approved`, `inapp_on_message_rejected`, `inapp_on_new_event`, `inapp_on_event_update`, `inapp_on_new_sponsorship`, `inapp_on_sponsorship_update`, `inapp_on_comment_on_post`, `inapp_on_comment_on_thread`
- **RLS:** Users manage their own preferences

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

### 5. Frontend Components

**NotificationBell** (`src/components/NotificationBell.tsx`)
- **Location:** UnifiedHeader, before profile dropdown menu
- **Badge:** Red count (9+ shows "9+")
- **Popover:** Opens NotificationList on click
- **Accessibility:** ARIA label with count

**NotificationList** (`src/components/NotificationList.tsx`)
- **Layout:** Scrollable list (400px height), 380px width
- **Display:** Icon, title, message, timestamp (relative via `date-fns`)
- **Unread:** Primary background + blue dot indicator
- **Actions:**
  - Click notification → Navigate to link + mark as read
  - Hover → Show delete button (X)
  - Header: "Mark all read" + "Clear read" buttons
- **Empty state:** Bell icon + "No notifications yet"
- **Features:** Individual delete, bulk clear read notifications

### 6. Custom Hooks

**useNotifications** (`src/hooks/useNotifications.ts`)
- **State:** `notifications[]`, `unreadCount`, `loading`
- **Methods:**
  - `markAsRead(id)` - Mark single notification as read
  - `markAllAsRead()` - Mark all user's notifications as read
  - `deleteNotification(id)` - Delete single notification (with toast)
  - `deleteAllRead()` - Delete all read notifications (with toast)
  - `handleNotificationClick(notification)` - Mark read + navigate to link
  - `refreshNotifications()` - Manual reload
- **Realtime:** Subscribes to `notifications` table changes (INSERT/UPDATE/DELETE)
- **Auth:** Auto-refreshes on sign in/out, clears state on sign out
- **Cleanup:** Unsubscribes from channels on unmount

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

---

## USER WORKFLOWS

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

## FUTURE ENHANCEMENTS

- [ ] Push notifications (web push API for desktop/mobile browsers)
- [ ] Notification grouping (e.g., "5 new comments on your post")
- [ ] Digest emails (daily/weekly summaries of activity)
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
