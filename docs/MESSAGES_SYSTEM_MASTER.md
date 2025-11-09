# Messages System Master Documentation

## System Overview
The Messages System enables communication between sponsors, besties, and guardians through a moderated messaging platform with AI content moderation, approval workflows, real-time notifications, and multi-media support (text, audio, image, video).

**Key Features:**
- Guardian-to-sponsor messaging on behalf of besties
- Bestie-to-sponsor direct messaging
- Optional guardian approval workflow
- AI-powered content moderation
- Multi-media support (text, audio, image, video)
- Real-time unread badge counters
- Email notifications with preferences
- Message status tracking (pending_approval, pending_moderation, approved, sent, rejected)

---

## Database Schema

### `sponsor_messages` Table
Primary table storing all messages between sponsors and besties.

**Columns:**
- `id` (uuid, PK) - Unique message identifier
- `bestie_id` (uuid, FK → profiles) - Bestie this message is about/from
- `sponsor_email` (text) - Sponsor recipient email (for guest sponsors)
- `sponsor_id` (uuid, FK → auth.users) - Sponsor recipient user ID (authenticated sponsors)
- `sent_by` (uuid, FK → auth.users) - User who sent the message
- `from_guardian` (boolean, default: false) - Whether message is from guardian vs bestie
- `subject` (text, required) - Message subject line
- `message` (text) - Message body text (optional if media attached)
- `audio_url` (text) - URL to audio attachment
- `image_url` (text) - URL to image attachment
- `video_url` (text) - URL to video attachment
- `status` (text) - Message delivery status: `pending_approval` | `pending_moderation` | `approved` | `sent` | `rejected`
- `approval_status` (text) - Guardian approval status: `pending` | `approved` | `rejected`
- `rejection_reason` (text) - Reason if rejected by guardian or moderator
- `moderation_result` (jsonb) - AI moderation results
- `moderation_severity` (text) - Severity: `low` | `medium` | `high` | `manual_review`
- `is_read` (boolean, default: false) - Whether sponsor has read the message
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies:**
- `SELECT`: Users can see messages they sent OR messages for besties they sponsor OR besties they're guardian of
- `INSERT`: Authenticated users can insert messages for besties they're linked to or sponsor
- `UPDATE`: Admins, message sender, guardians of bestie, and sponsors can update (for marking read, approving, etc.)
- `DELETE`: Admins only

---

## Message Workflows

### 1. Guardian Sends Message to Sponsors
**Flow:** Guardian → (Optional Approval) → (Optional AI Moderation) → All Sponsors of Bestie

**Steps:**
1. Guardian selects linked bestie with `allow_sponsor_messages = true`
2. Guardian chooses "From Guardian" option
3. Composes message with optional media
4. If bestie has `require_message_approval = true`:
   - Status: `pending_approval`
   - Bestie reviews in `/guardian-approvals` Messages tab
   - Bestie can approve as-is, edit + approve, or reject with reason
5. If media attached, AI moderation runs:
   - Check `moderation_settings.sponsor_message_image_policy` and `sponsor_message_video_policy`
   - Policies: `none` (skip) | `flagged` (AI check) | `all` (require admin review)
   - If flagged or policy = all: Status → `pending_moderation`
6. Once approved and moderated: Status → `approved`
7. Trigger sends email notifications to sponsors (via `send-message-notification` edge function)
8. Sponsor views message in `/bestie-messages` inbox
9. Status updates to `sent` when sponsor opens message

### 2. Bestie Sends Message to Sponsors
**Flow:** Bestie → (Optional AI Moderation) → All Sponsors

**Steps:**
1. Bestie visits `/bestie-messages` page
2. Composes message with optional media
3. If media attached, AI moderation runs (same logic as guardian flow)
4. Status: `approved` or `pending_moderation`
5. Email notifications sent to all sponsors
6. Status → `sent` when sponsors view

### 3. Sponsor Views Messages
**Flow:** Sponsor → Inbox → Read → Mark as Read

**Steps:**
1. Sponsor logs in and sees unread badge count
2. Visits `/bestie-messages` page (redirects non-besties)
3. Messages displayed in accordion grouped by bestie
4. Opening message marks `is_read = true`
5. Unread badge updates in real-time via `useSponsorUnreadCount` hook

---

## Components

### Frontend Components

**`GuardianSponsorMessenger.tsx`**
- Location: `src/components/guardian/GuardianSponsorMessenger.tsx`
- Purpose: Guardian interface to send messages to sponsors on behalf of besties
- Features:
  - Bestie selection (filtered by `allow_sponsor_messages = true`)
  - Message from selector (guardian vs bestie)
  - Subject + message text inputs
  - Multi-media upload (audio, image, video)
  - AI moderation integration
  - Status notifications
- Usage: Embedded in `/guardian-links` page

**`BestieSponsorMessenger.tsx`**
- Location: `src/components/bestie/BestieSponsorMessenger.tsx`
- Purpose: Bestie interface to send messages directly to sponsors
- Features: Similar to GuardianSponsorMessenger but without "from guardian" option

**`SponsorMessageInbox.tsx`**
- Location: `src/components/sponsor/SponsorMessageInbox.tsx`
- Purpose: Display messages to sponsors from besties
- Features:
  - Accordion grouped by bestie
  - Unread indicators
  - Multi-media playback (AudioPlayer, VideoPlayer, images)
  - Mark as read on open
  - Real-time updates
- Usage: Embedded in `/bestie-messages` page

**`MessageModerationQueue.tsx`**
- Location: `src/components/admin/MessageModerationQueue.tsx`
- Purpose: Admin interface to moderate flagged messages
- Features:
  - List pending moderation messages
  - Display AI moderation results and severity
  - Approve/reject individual messages
  - Bulk approve all / reject & delete all
  - Real-time subscription
- Usage: `/admin` → Moderation → Messages tab

**`BestieSponsorMessages.tsx`**
- Location: `src/components/admin/BestieSponsorMessages.tsx`
- Purpose: Guardian approval interface for bestie messages
- Features:
  - List pending approval messages
  - Approve as-is, edit + approve, or reject
  - Image cropping for edited images
  - Video upload for edited videos
- Usage: `/guardian-approvals` → Messages tab

### Pages

**`BestieMessages.tsx`**
- Route: `/bestie-messages`
- Access: Besties and sponsors (redirects others)
- Purpose: Main inbox page for sponsors to view messages from besties
- Components: UnifiedHeader, BestieSponsorMessenger (for besties) or SponsorMessageInbox (for sponsors), Footer

---

## Real-Time System

### Hooks

**`useSponsorUnreadCount.ts`**
- Purpose: Track unread message count for sponsors
- Logic:
  1. Fetch all active sponsorships for current user
  2. Count messages where `bestie_id IN (sponsored_besties)` AND `status IN (approved, sent)` AND `is_read = false`
  3. Subscribe to real-time changes on `sponsor_messages` and `sponsorships` tables
  4. Update count immediately on any change
- Returns: `{ count, loading, refetch }`
- Used in: UnifiedHeader bell badge

**`useMessageModerationCount.ts`**
- Purpose: Track messages pending admin moderation
- Logic:
  1. Check if user is admin
  2. Count messages where `status = pending_moderation`
  3. Subscribe to real-time changes on `sponsor_messages`
  4. Update count on any change
- Returns: `{ count, loading, refetch, isAdmin }`
- Used in: Admin dashboard Moderation tab badge

**`useGuardianApprovalsCount.ts`**
- Purpose: Track all pending guardian approvals (posts, comments, messages, vendor assets)
- Logic: Includes messages where `approval_status = pending` AND guardian is linked to bestie
- Returns: `{ count, loading, refetch }`
- Used in: UnifiedHeader Approvals badge, Guardian Approvals page

---

## Edge Functions

### `send-message-notification`
**Location:** `supabase/functions/send-message-notification/index.ts`

**Purpose:** Send email notifications when new messages are sent or status changes

**Triggered By:**
- Database trigger on `sponsor_messages` INSERT
- Manual invocation when message status changes

**Request Body:**
```typescript
{
  messageId: string;
  recipientId: string;
  notificationType: 'new_sponsor_message' | 'message_status_change';
  rejectionReason?: string;
}
```

**Logic:**
1. Fetch recipient notification preferences
2. Check if notification type is enabled
3. Fetch message details and sender/bestie names
4. Construct email based on notification type
5. Send via Resend API
6. Log to `email_notifications_log` table

**Email Types:**
- `new_sponsor_message`: Notifies sponsor of new message from bestie
- `message_status_change`: Notifies sender if message was rejected

### `moderate-image`
**Location:** `supabase/functions/moderate-image/index.ts`

**Purpose:** AI-powered image content moderation using Lovable AI

**Request Body:**
```typescript
{
  imageUrl: string;
}
```

**Response:**
```typescript
{
  approved: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}
```

**Integration:** Called during message composition when image is uploaded

### `moderate-video`
**Location:** `supabase/functions/moderate-video/index.ts`

**Purpose:** AI-powered video content moderation using Lovable AI

**Request Body:**
```typescript
{
  videoUrl: string;
}
```

**Response:** Same as moderate-image

### `moderate-content`
**Location:** `supabase/functions/moderate-content/index.ts`

**Purpose:** AI-powered text content moderation

**Used For:** Text moderation in discussions, comments (not currently used for messages but available)

---

## AI Moderation System

### Configuration

**`moderation_settings` Table:**
- `sponsor_message_image_policy`: `none` | `flagged` | `all`
- `sponsor_message_video_policy`: `none` | `flagged` | `all`

**Policies:**
- `none`: Skip moderation, approve immediately
- `flagged`: Run AI check, flag if inappropriate
- `all`: Require manual admin review for all media

### Moderation Flow

**When Image/Video Uploaded:**
1. Upload to `app-assets` storage bucket under `sponsor-messages/{user_id}/` folder
2. Get public URL
3. Check policy setting
4. If policy = `flagged`: Invoke AI moderation edge function
5. If AI flags OR policy = `all`: Set `status = pending_moderation` + store `moderation_result` + set `moderation_severity`
6. If approved: Set `status = approved`

**Admin Review:**
- Admin sees flagged messages in MessageModerationQueue
- Can approve (change status to `approved`) or reject (change status to `rejected` + add reason)

---

## Status & Approval Flow

### Message Status Values
- `pending_approval`: Waiting for bestie to approve guardian's message
- `pending_moderation`: Flagged by AI or requires admin review per policy
- `approved`: Ready to send to sponsors
- `sent`: Sponsors have been notified (status updated when first sponsor views)
- `rejected`: Rejected by guardian or admin moderator

### Approval Status Values (Guardian Approval)
- `pending`: Waiting for bestie approval (only when `require_message_approval = true`)
- `approved`: Bestie approved message
- `rejected`: Bestie rejected message

### State Transitions

```
Guardian creates message
  ├─ require_message_approval = false
  │   ├─ No media → status: approved
  │   └─ With media → AI moderation
  │       ├─ Policy = none → status: approved
  │       ├─ Policy = flagged + clean → status: approved
  │       └─ Policy = flagged + flagged OR policy = all → status: pending_moderation
  │
  └─ require_message_approval = true
      ├─ approval_status: pending
      └─ Bestie approves → (same media flow as above)

Admin moderation
  ├─ Approve → status: approved → emails sent
  └─ Reject → status: rejected → sender notified

Sponsor views
  └─ status: approved → sent (first view)
      └─ is_read: false → true (per sponsor)
```

---

## Notification System

### In-App Notifications
Created in `notifications` table for:
- New sponsor message (`new_sponsor_message` type)
- Message status change (rejection)

**Trigger:** Database trigger on `sponsor_messages` INSERT/UPDATE

**Badge Locations:**
- UnifiedHeader bell icon (all notification types)
- Admin Moderation tab (pending moderation count)
- Guardian Approvals button (pending approval count)

### Email Notifications
Sent via `send-message-notification` edge function using Resend

**User Preferences:** `notification_preferences` table
- `enable_sponsor_messages`: Enable/disable sponsor message emails

**Email Content:**
- Subject: "New message from [Bestie Name]"
- Body: Includes bestie name, subject, message preview, link to view in app
- App logo included from `app_settings`

---

## Testing

### E2E Tests
**Location:** `tests/e2e/archived/week6-final-archive/email-messages.spec.ts`

**Scenarios:**
1. Sponsor sends message to bestie
   - Creates message in DB
   - Invokes `send-message-notification`
   - Verifies notification created
2. Bestie sends message to sponsor
   - Creates message in DB
   - Invokes notification function
   - Verifies notification created
3. Guardian sends message to sponsor
   - Fetches guardian info
   - Creates message with `from_guardian: true`
   - Invokes notification function
   - Verifies notification created

**Cleanup:** `afterEach` deletes test messages and notifications

### Integration Tests
Test moderation policies, status transitions, approval workflows, real-time updates

---

## Security & RLS

### Row Level Security Policies

**SELECT:**
```sql
-- Users can see messages they sent
auth.uid() = sent_by

-- Users can see messages for besties they sponsor
EXISTS (
  SELECT 1 FROM sponsorships
  WHERE sponsor_id = auth.uid()
  AND bestie_id = sponsor_messages.bestie_id
  AND status = 'active'
)

-- Guardians can see messages for their linked besties
EXISTS (
  SELECT 1 FROM caregiver_bestie_links
  WHERE caregiver_id = auth.uid()
  AND bestie_id = sponsor_messages.bestie_id
)

-- Admins can see all
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin', 'owner')
)
```

**INSERT:**
- Authenticated users can insert messages for besties they're linked to or sponsor

**UPDATE:**
- Admins can update all
- Message sender can update own messages
- Guardians can update messages for their besties (for approval workflow)
- Sponsors can update `is_read` for messages of besties they sponsor

**DELETE:**
- Admins and owners only

### Storage Security
**Bucket:** `app-assets`
**Folder:** `sponsor-messages/{user_id}/`
**RLS:** Users can upload to their own folder, admins can access all

---

## File Storage

### Media Upload Pattern
1. User uploads file via `<input type="file">`
2. Frontend compresses image (if image) using `compressImage()`
3. Upload to Supabase Storage: `app-assets` bucket
4. Path: `sponsor-messages/{user_id}/{timestamp}_{filename}`
5. Get public URL
6. Run AI moderation (if applicable)
7. Store URL in `audio_url`, `image_url`, or `video_url` column

### Supported Formats
- **Audio:** Any `audio/*` MIME type (webm, mp3, wav, etc.)
- **Image:** Any `image/*` MIME type (jpeg, png, gif, webp)
- **Video:** Any `video/*` MIME type (mp4, webm, etc.)

---

## UI Patterns

### Message Composition
- Subject input (required)
- Message textarea (optional if media attached)
- Radio group: "From Bestie" or "From Guardian" (guardian only)
- Media buttons: Record Audio, Upload Audio, Upload Image, Upload Video
- Media preview with remove option
- AI moderation status indicators during upload
- Send button with loading state

### Message Display
- Accordion grouped by bestie
- Unread indicator (red dot)
- Subject + sender + date in header
- Expandable content shows:
  - Full message text
  - Audio player (if audio)
  - Video player (if video)
  - Image display (if image)
- Mark as read on open

### Admin Moderation Queue
- Table with columns: Subject, Sender, Recipient, Date, Severity Badge
- Expand to show:
  - Full message content
  - Media preview
  - AI moderation results
  - Flagged reasons
  - Approve/Reject buttons
- Bulk actions: Approve All, Reject & Delete All

---

## Configuration

### Enable/Disable Messaging
**Per Bestie Settings:** `caregiver_bestie_links` table
- `allow_sponsor_messages` (boolean, default: true) - Enable sponsor messaging
- `require_message_approval` (boolean, default: true) - Require guardian approval for guardian messages

**Set via:** `/guardian-links` page → Bestie accordion → Sponsor Communication section

### Moderation Policies
**Global Settings:** `moderation_settings` table
- `sponsor_message_image_policy`: `none` | `flagged` | `all`
- `sponsor_message_video_policy`: `none` | `flagged` | `all`

**Set via:** `/admin` → Moderation → Policies tab

### Notification Preferences
**Per User:** `notification_preferences` table
- `enable_sponsor_messages` (boolean, default: true)

**Set via:** `/notifications` page → Settings

---

## Troubleshooting

### Messages Not Sending
1. Check bestie has `allow_sponsor_messages = true`
2. Verify status is not stuck in `pending_approval` or `pending_moderation`
3. Check guardian has approval permission if `require_message_approval = true`
4. Verify edge function `send-message-notification` is deployed
5. Check Resend API key is configured

### Unread Badge Not Updating
1. Verify real-time subscription is active in `useSponsorUnreadCount`
2. Check `is_read` column is being updated on message open
3. Confirm RLS policies allow SELECT on `sponsor_messages` for current user
4. Check browser console for subscription errors

### AI Moderation Failing
1. Verify Lovable AI is enabled (check secrets)
2. Check image/video URL is publicly accessible
3. Review edge function logs for `moderate-image` or `moderate-video`
4. Fallback: Set policy to `none` to bypass moderation temporarily

### Email Notifications Not Sending
1. Check user notification preferences (`enable_sponsor_messages`)
2. Verify Resend API key (`RESEND_API_KEY`) is configured
3. Check `email_notifications_log` table for error messages
4. Verify edge function `send-message-notification` is deployed

---

## Implementation Checklist

**Database:**
- [ ] `sponsor_messages` table with all columns
- [ ] `caregiver_bestie_links` with message-related flags
- [ ] `moderation_settings` with image/video policies
- [ ] `notification_preferences` with sponsor message toggle
- [ ] RLS policies for secure access
- [ ] Database triggers for notifications

**Edge Functions:**
- [ ] `send-message-notification` (email sending)
- [ ] `moderate-image` (AI image moderation)
- [ ] `moderate-video` (AI video moderation)
- [ ] `moderate-content` (text moderation, optional)

**Frontend Components:**
- [ ] `GuardianSponsorMessenger` (guardian message composer)
- [ ] `BestieSponsorMessenger` (bestie message composer)
- [ ] `SponsorMessageInbox` (sponsor inbox)
- [ ] `MessageModerationQueue` (admin moderation interface)
- [ ] `BestieSponsorMessages` (guardian approval interface)

**Hooks:**
- [ ] `useSponsorUnreadCount` (sponsor badge counter)
- [ ] `useMessageModerationCount` (admin badge counter)
- [ ] `useGuardianApprovalsCount` (includes message approvals)

**Pages:**
- [ ] `/bestie-messages` (sponsor inbox + bestie composer)
- [ ] `/guardian-links` (includes GuardianSponsorMessenger)
- [ ] `/guardian-approvals` (includes message approval tab)
- [ ] `/admin` → Moderation → Messages (admin moderation queue)

**Storage:**
- [ ] `app-assets` bucket configured
- [ ] `sponsor-messages/{user_id}/` folder structure
- [ ] RLS policies for storage uploads

**Secrets:**
- [ ] `RESEND_API_KEY` for email sending
- [ ] Lovable AI configured for moderation

**Testing:**
- [ ] E2E tests for message sending flows
- [ ] Integration tests for moderation policies
- [ ] Real-time subscription tests

---

## Related Documentation
- [SPONSORSHIP_SYSTEM.md](./SPONSORSHIP_SYSTEM.md) - Sponsorship and funding system
- [GUARDIAN_LINKS_SYSTEM.md](./GUARDIAN_LINKS_SYSTEM.md) - Guardian-bestie relationships
- [NOTIFICATION_SYSTEM_COMPLETE.md](./NOTIFICATION_SYSTEM_COMPLETE.md) - In-app and email notifications
- [EDGE_FUNCTIONS_REFERENCE.md](./EDGE_FUNCTIONS_REFERENCE.md) - All edge functions
- [MASTER_SYSTEM_DOCS.md](./MASTER_SYSTEM_DOCS.md) - Concise system overview
