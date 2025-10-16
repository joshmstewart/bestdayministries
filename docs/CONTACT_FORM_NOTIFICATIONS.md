# Contact Form Notification System

## Overview
The contact form system integrates with the notification system to alert admins about new submissions and user replies in real-time.

## Notification Types

### 1. contact_form_submission
**Triggered when:** 
- User submits contact form via website
- Email arrives directly (via CloudFlare routing) without matching submission

**Notification details:**
```typescript
{
  type: 'contact_form_submission',
  title: 'New Email Received',
  message: '{Name} ({email}) sent an email',
  link: '/admin?tab=contact',
  metadata: {
    submission_id: 'uuid',
    sender_email: 'user@example.com',
    source: 'form' | 'email'
  }
}
```

### 2. contact_form_reply
**Triggered when:** User replies to admin email via their email client

**Notification details:**
```typescript
{
  type: 'contact_form_reply',
  title: 'New Contact Form Reply',
  message: '{Name} replied to their message',
  link: '/admin?tab=contact',
  metadata: {
    submission_id: 'uuid',
    sender_email: 'user@example.com'
  }
}
```

## Badge Counter Logic

### useContactFormCount Hook
**Location:** `src/hooks/useContactFormCount.ts`

**Performance Optimization:**
- **Single Query Pattern:** Fetches ALL replies in ONE query instead of N individual queries per submission
- **Client-side Filtering:** Uses JavaScript Map/filter operations to count replies for each submission
- **Prevents Timeouts:** Eliminates database connection exhaustion from hundreds of individual queries
- **Realtime Safe:** Efficient enough to run on every realtime update without performance issues

**Counts:**
1. **New submissions** - submissions with `status === 'new'`
2. **Submissions with unread user replies** - where latest user reply timestamp > last admin interaction

**Formula:**
```typescript
// Fetch all replies once:
const { data: allReplies } = await supabase
  .from("contact_form_replies")
  .select("submission_id, sender_type, created_at")
  .in("submission_id", submissionIds);

// Count client-side using JavaScript:
submissionsWithReplies.forEach(submission => {
  const repliedAt = submission.replied_at || "1970-01-01";
  const hasUnreadReplies = allReplies?.some(
    reply => reply.submission_id === submission.id && 
             reply.sender_type === "user" && 
             reply.created_at >= repliedAt
  );
  if (hasUnreadReplies) unreadRepliesCount++;
});
```

**Realtime subscriptions:**
- Subscribes to `contact_form_submissions` table (INSERT, UPDATE, DELETE events)
- Subscribes to `contact_form_replies` table (INSERT, UPDATE, DELETE events)
- Automatically recalculates count on any change
- Separate listeners for each event type ensure deleted submissions/replies immediately update badge counts

## UI Indicators

### Admin Header (UnifiedHeader)
- Badge shows total count (new submissions + unread replies)
- Example: Contact(3) if 2 new submissions + 1 submission with unread reply

### Contact Tab
- Same badge logic as header
- Synchronized via same hook

### Submissions Table
**Visual indicators:**
- **Red dot in first column:**
  - Shows when `status === 'new'` OR
  - Shows when `unread_user_replies > 0`
  - Tooltip: \"New submission\" or \"New reply\"

**Reply button badge:**
- Shows count of unread user replies
- Only visible when count > 0
- Red badge with white text
- Example: \"Reply (2)\" if 2 unread user replies

### Row Example
```tsx
<TableRow className={submission.status === \"new\" ? \"bg-blue-50\" : \"\"}>
  <TableCell>
    {((submission.status === \"new\") || ((submission.unread_user_replies || 0) > 0)) && (
      <div className=\"w-2 h-2 rounded-full bg-destructive\" 
           title={submission.status === \"new\" ? \"New submission\" : \"New reply\"} />
    )}
  </TableCell>
  {/* ... other cells ... */}
  <TableCell>
    <Button onClick={() => openReplyDialog(submission)} variant=\"default\" size=\"sm\">
      Reply
      {submission.unread_user_replies && submission.unread_user_replies > 0 && (
        <Badge variant=\"destructive\" className=\"ml-2\">
          {submission.unread_user_replies}
        </Badge>
      )}
    </Button>
  </TableCell>
</TableRow>
```

## Notification Clearing

### When notifications are marked as read:
**Trigger:** Admin opens reply dialog for a submission

**Process:**
1. Admin clicks \"Reply\" button
2. `openReplyDialog` function calls `markContactNotificationsAsRead(submissionId)`
3. Function marks ALL notifications related to that submission as `is_read: true`:
   - `contact_form_submission` notifications with matching `submission_id`
   - `contact_form_reply` notifications with matching `submission_id`
4. Real-time subscription updates badge counters
5. Red dot indicator removed from submission row
6. Badge on \"Reply\" button disappears

**Implementation:**
```typescript
const markContactNotificationsAsRead = async (submissionId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`metadata->>submission_id.eq.${submissionId}`)
    .in('type', ['contact_form_submission', 'contact_form_reply'])
    .eq('is_read', false);
    
  if (error) {
    console.error('Error marking notifications as read:', error);
  }
};
```

## Workflow Examples

### New Submission Flow
1. User submits form
2. Submission saved to database with `status: 'new'`
3. `contact_form_submission` notification created for admins
4. Badge counter increments: Contact(1)
5. Admin clicks \"Reply\" → notifications cleared → badge decrements

### User Reply Flow
1. User replies to admin email
2. CloudFlare routes email to edge function
3. Reply saved with `sender_type: 'user'`, `created_at: now()`
4. `contact_form_reply` notification created for admins
5. Badge counter increments: Contact(2)
6. Red dot appears on submission row
7. Reply button shows: \"Reply (1)\"
8. Admin clicks \"Reply\" → notifications cleared → indicators removed

### Multiple Replies Flow
1. User replies twice before admin responds
2. Two reply records created with timestamps
3. Two notifications created
4. Badge shows: Contact(3) (if 1 other new submission)
5. Reply button shows: \"Reply (2)\"
6. Admin opens reply dialog → both reply notifications cleared
7. Badge updates: Contact(1) (only the other new submission)

## Database Queries

### Count new submissions:
```sql
SELECT COUNT(*) 
FROM contact_form_submissions 
WHERE status = 'new';
```

### Count submissions with unread replies:
```sql
SELECT s.id, COUNT(r.id) as unread_count
FROM contact_form_submissions s
JOIN contact_form_replies r ON r.submission_id = s.id
WHERE r.sender_type = 'user'
  AND (s.replied_at IS NULL OR r.created_at > s.replied_at)
GROUP BY s.id;
```

### Get all unread notifications for contact forms:
```sql
SELECT * 
FROM notifications 
WHERE type IN ('contact_form_submission', 'contact_form_reply')
  AND is_read = false
ORDER BY created_at DESC;
```

## Edge Function Integration

### process-inbound-email
**Creates notifications when:**
- New email arrives → `contact_form_submission`
- User replies to existing thread → `contact_form_reply`

**Notification creation code:**
```typescript
// For new submissions:
await supabase.from('notifications').insert({
  user_id: admin.user_id,
  type: 'contact_form_submission',
  title: 'New Email Received',
  message: `${senderName} (${senderEmail}) sent an email`,
  link: '/admin?tab=contact',
  metadata: {
    submission_id: newSubmission.id,
    sender_email: senderEmail,
    source: 'email'
  }
});

// For replies:
await supabase.from('notifications').insert({
  user_id: admin.user_id,
  type: 'contact_form_reply',
  title: 'New Contact Form Reply',
  message: `${matchedSubmission.name} replied to their message`,
  link: '/admin?tab=contact',
  metadata: {
    submission_id: matchedSubmission.id,
    sender_email: senderEmail
  }
});
```

## Testing

### Manual Testing Steps
1. Submit contact form → verify badge increments
2. Check notification bell → verify notification appears
3. Click \"Reply\" → verify badge decrements
4. Have user reply via email → verify badge increments again
5. Check reply button badge → verify shows count
6. Open reply dialog → verify all notifications cleared

### E2E Test Coverage Needed
- Badge counter updates on new submission
- Badge counter updates on user reply
- Badge counter decrements when reply dialog opened
- Red dot indicator appears/disappears
- Reply button badge shows correct count
- Multiple submissions with replies counted correctly

## Related Files
- `src/hooks/useContactFormCount.ts` - Badge counter logic
- `src/components/admin/ContactFormManager.tsx` - UI indicators
- `supabase/functions/process-inbound-email/index.ts` - Notification creation
- `supabase/functions/send-contact-reply/index.ts` - Updates replied_at timestamp
- `docs/NOTIFICATION_SYSTEM_COMPLETE.md` - Main notification system
- `docs/CONTACT_FORM_SYSTEM.md` - Contact form features
- `docs/CLOUDFLARE_EMAIL_ROUTING_SETUP.md` - Email routing setup
