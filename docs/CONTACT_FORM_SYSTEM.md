# Contact Form System Documentation

## Overview
The contact form system provides a comprehensive solution for managing user inquiries, bug reports, and feature requests with full conversation threading capabilities.

## Database Schema

### contact_form_settings
- `id` - UUID primary key
- `is_enabled` - Boolean (show/hide form)
- `title` - Text (form heading)
- `description` - Text (form subheading)
- `recipient_email` - Text (where notifications are sent)
- `reply_from_email` - Text (email address replies come from)
- `reply_from_name` - Text (sender name for replies)
- `success_message` - Text (shown after submission)
- `created_at`, `updated_at` - Timestamps

### contact_form_submissions
- `id` - UUID primary key
- `name` - Text (required)
- `email` - Text (required)
- `subject` - Text (optional)
- `message` - Text (required)
- `message_type` - Text (general | bug_report | feature_request)
- `image_url` - Text (optional attachment)
- `status` - Text (new | read)
- `replied_at` - Timestamp (first reply time)
- `replied_by` - UUID (admin who first replied)
- `reply_message` - Text (first reply message for backward compatibility)
- `admin_notes` - Text (internal notes)
- `created_at` - Timestamp

### contact_form_replies (NEW - Added 2025-01-14)
**Purpose:** Store threaded conversation history for back-and-forth communication

- `id` - UUID primary key
- `submission_id` - UUID (references contact_form_submissions)
- `sender_type` - Text ('admin' | 'user')
- `sender_id` - UUID (references auth.users, null for user replies)
- `sender_name` - Text
- `sender_email` - Text
- `message` - Text
- `created_at` - Timestamp

**Migration:** Existing replies from `contact_form_submissions.reply_message` were automatically migrated to this table

## Edge Functions

### send-contact-reply
**Purpose:** Send reply email and save to conversation thread

**Input:**
```typescript
{
  submissionId: string (uuid),
  replyMessage: string (1-5000 chars),
  adminNotes?: string (max 1000 chars)
}
```

**Process:**
1. Validate input with Zod schema
2. Verify admin authorization
3. Fetch submission details
4. Get admin profile for signature
5. Build HTML email with app branding
6. Send email via Resend
7. **Save reply to `contact_form_replies` table**
8. Update admin notes if provided
9. Trigger updates submission table (replied_at, status)

**Security:**
- Requires authentication
- Admin/owner role verified
- HTML sanitization for reply message
- Input validation (Zod)

### notify-admin-new-contact
**Purpose:** Send notification email to admin when new submission arrives

**Trigger:** Automatic on contact form submission

## Frontend Components

### ContactForm
**Location:** Site footer (all pages when enabled)

**Features:**
- Auto-loads settings from database
- Client-side validation (Zod)
- Message type selection
- Optional image upload
- Optional subject line
- Graceful email handling

### ContactFormManager
**Location:** Admin > Contact tab

**Features:**
- Settings configuration
- Submissions table with status badges
- **Threaded conversation view**
- Reply composition
- Manual user reply entry
- Admin notes (internal)
- Status management (new/read)
- Email quick actions

## Conversation Threading System (NEW)

### View Dialog
**Shows:**
1. **Original Message** - User's initial submission with blue accent
2. **Conversation Thread** - All replies in chronological order:
   - Admin replies: Green background, green border
   - User replies: Blue background, blue border
   - Each shows: sender name, type badge, timestamp, message
3. **Admin Notes** - Internal notes in amber box
4. **Actions:**
   - "Reply" - Compose new reply
   - "Add User Reply" - Manually add incoming email
   - "Mark Unread" - Change status

### Reply Dialog
**Shows:**
1. **Conversation Context** - Full thread history with original message
2. **Compose Area** - Text area for new reply
3. **Admin Notes** - Optional internal notes field
4. **Actions:**
   - "Send Reply" - Email and save to thread
   - "Cancel" - Close without sending

### Add User Reply Dialog
**Purpose:** Manually add incoming email replies to the conversation

**Process:**
1. Admin receives reply via email (outside system)
2. Admin clicks "Add User Reply" in view dialog
3. Pastes the user's email content
4. Saves as user-type reply in thread
5. Appears in conversation history

**Note:** This is manual because automatic email parsing requires:
- Inbound email webhook setup with Resend
- Email parsing logic
- Verification of sender identity
- More complex infrastructure

## UI Patterns

### Thread Message Styling
```typescript
// User messages (original + incoming)
bg-blue-50 border-l-4 border-blue-500

// Admin messages (outgoing replies)
bg-green-50 border-l-4 border-green-500

// Original submission
bg-muted border-l-4 border-primary
```

### Status Badges
- **New** - Blue badge, red dot indicator
- **Read** - Gray badge
- **Replied** - Green checkmark indicator

### Button States
- Button shows "Continue Conversation" after first reply
- Opens reply dialog with full thread context
- No longer disabled after first reply

## RLS Policies

### contact_form_submissions
- **INSERT:** Anyone (including anonymous) can submit
- **SELECT:** Admins/owners only
- **UPDATE:** Admins/owners only

### contact_form_replies
- **INSERT:** Admins/owners only
- **SELECT:** Admins/owners only

### contact_form_settings
- **SELECT:** Public can read if enabled
- **UPDATE:** Admins/owners only

## Database Triggers

### update_submission_on_first_reply()
**Trigger:** After INSERT on contact_form_replies

**Purpose:** Maintain backward compatibility with submissions table

**Logic:**
- When first admin reply is added to thread
- Updates `contact_form_submissions`:
  - `replied_at` - Set to reply timestamp
  - `replied_by` - Set to admin user ID
  - `reply_message` - Copy of first reply message
  - `status` - Set to 'read'

## Workflow Examples

### Simple Reply (First Response)
1. User submits form → Creates submission record
2. Admin views submission → Status changes to "read"
3. Admin clicks "Reply" → Opens reply dialog with original message
4. Admin types reply and sends → Email sent + saved to replies table
5. Trigger updates submission table with first reply info
6. Submission shows "Continue Conversation" button

### Ongoing Conversation
1. User replies via email → Admin receives in inbox
2. Admin opens submission → Clicks "View"
3. Views conversation thread
4. Clicks "Add User Reply" → Pastes email content → Saves
5. User reply appears in blue in thread
6. Admin clicks "Reply" → Composes response with full context
7. New admin reply sent and added to thread
8. Repeat as needed

### Multiple Back-and-Forth
- Thread displays all messages chronologically
- Color coding distinguishes admin vs user
- Full context always visible when replying
- No limit on conversation length

## Email Configuration

### Resend Setup
1. Sign up at https://resend.com
2. Add and verify domain (SPF, DKIM records)
3. Create API key
4. Add `RESEND_API_KEY` to secrets
5. Update `reply_from_email` in settings

### Email Template Features
- App logo in header (from app_settings)
- Professional formatting
- Original message quoted
- Admin signature
- Reply-to header set to admin email

## Integration Points

### Notification System
- Admins receive notification on new submission
- Badge counter in admin header
- Real-time updates via Supabase subscriptions

### Admin Dashboard
- Contact tab with badge counter
- Settings + Submissions in single view
- Quick actions in table rows

## Future Enhancements

### Automatic Email Reply Capture
To automatically capture incoming email replies:

1. **Set up Resend Inbound Webhook**
   ```typescript
   // New edge function: process-inbound-email
   // Parse incoming email from Resend webhook
   // Match to submission by reply-to or subject
   // Extract message content
   // Save as user reply to thread
   ```

2. **Email Parsing Requirements**
   - Parse plain text and HTML
   - Extract message from quoted reply chain
   - Verify sender matches original email
   - Handle attachments if needed

3. **Security Considerations**
   - Verify webhook signature from Resend
   - Sanitize incoming email content
   - Prevent spam/abuse
   - Rate limiting for inbound emails

### Additional Features
- Email notifications to admin on user replies
- Rich text editor for admin replies
- File attachments in replies
- Canned response templates
- Search and filter conversation history
- Export conversation as PDF

## Testing

### Manual Testing Steps
1. Submit contact form as user
2. Verify admin receives notification
3. Reply from admin panel
4. Check email received correctly
5. Add manual user reply
6. Send another admin reply
7. Verify full thread displays correctly

### E2E Tests (TODO)
- Contact form submission
- Admin reply sending
- Thread display verification
- Manual user reply addition
- Multiple back-and-forth messages

## Troubleshooting

### Email Not Sending
- Verify RESEND_API_KEY is set
- Check domain is verified in Resend
- Review SPF/DKIM records
- Check edge function logs

### Replies Not Appearing in Thread
- Verify RLS policies allow admin access
- Check edge function saved to replies table
- Reload submissions list
- Check browser console for errors

### User Reply Not Added
- Verify admin role
- Check RLS policy on insert
- Ensure message is not empty
- Review database logs

## Related Documentation
- [NOTIFICATION_SYSTEM_COMPLETE.md](./NOTIFICATION_SYSTEM_COMPLETE.md) - Admin notifications
- [ADMIN_DASHBOARD_CONCISE.md](./ADMIN_DASHBOARD_CONCISE.md) - Admin panel structure
- [EMAIL_TESTING_MAILTRAP.md](./EMAIL_TESTING_MAILTRAP.md) - Email testing guide
