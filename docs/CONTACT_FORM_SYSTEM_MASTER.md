# CONTACT FORM SYSTEM - MASTER DOCUMENTATION

Complete reference guide for the contact form system with email integration, conversation threading, and admin management.

---

## SYSTEM OVERVIEW

**Purpose**: Unified contact system with email routing, conversation threading, notifications, and admin management.

**Key Features**:
- Public contact form with validation
- Email routing (direct submissions + inbound replies)
- Conversation threading (admin ↔ user)
- Real-time notifications and badges
- Cloudflare Email Routing integration
- Resend email delivery
- Status management (new → read → replied)

**Architecture**: Frontend form → Database → Edge functions → Resend → Email → Cloudflare Worker → process-inbound-email

---

## DATABASE SCHEMA

### contact_form_settings
Configuration table (single row).

```sql
CREATE TABLE contact_form_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT true,
  title TEXT DEFAULT 'Contact Us',
  description TEXT,
  recipient_email TEXT DEFAULT 'contact@bestdayministries.org',
  reply_from_name TEXT DEFAULT 'Best Day Ministries',
  reply_from_email TEXT DEFAULT 'contact@bestdayministries.org',
  success_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### contact_form_submissions
Main submissions table.

```sql
CREATE TABLE contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'general',
  image_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'resolved')),
  source TEXT DEFAULT 'form' CHECK (source IN ('form', 'email')),
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES auth.users,
  reply_message TEXT,
  unread_user_replies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_submissions_status ON contact_form_submissions(status);
CREATE INDEX idx_submissions_email ON contact_form_submissions(email);
CREATE INDEX idx_submissions_user_id ON contact_form_submissions(user_id);
```

### contact_form_replies
Threaded conversation history.

```sql
CREATE TABLE contact_form_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES contact_form_submissions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_replies_submission ON contact_form_replies(submission_id, created_at DESC);
CREATE INDEX idx_replies_sender_type ON contact_form_replies(sender_type);
```

### email_audit_log
Universal email audit trail.

```sql
CREATE TABLE email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  html_content TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_audit_type ON email_audit_log(email_type);
CREATE INDEX idx_email_audit_recipient ON email_audit_log(recipient_email);
```

---

## RLS POLICIES

### contact_form_submissions
```sql
-- Public can insert (form submissions)
CREATE POLICY "Anyone can submit contact forms"
  ON contact_form_submissions FOR INSERT
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all submissions"
  ON contact_form_submissions FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Admins can update
CREATE POLICY "Admins can update submissions"
  ON contact_form_submissions FOR UPDATE
  USING (has_admin_access(auth.uid()));
```

### contact_form_replies
```sql
-- Admins can view all replies
CREATE POLICY "Admins can view all replies"
  ON contact_form_replies FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Admins can insert replies
CREATE POLICY "Admins can insert replies"
  ON contact_form_replies FOR INSERT
  WITH CHECK (has_admin_access(auth.uid()));
```

---

## EDGE FUNCTIONS

### send-contact-email
Handles initial form submission notification to admin.

**Path**: `supabase/functions/send-contact-email/index.ts`

**Input**:
```typescript
{
  name: string;
  email: string;
  subject?: string;
  message: string;
}
```

**Process**:
1. Validate input with Zod schema
2. Sanitize HTML (XSS prevention)
3. Send email to admin via Resend
4. Log to email_audit_log
5. Return success/error

**Validation Rules**:
- name: 1-100 chars
- email: valid email, max 255 chars
- subject: max 200 chars (optional)
- message: 1-5000 chars

**Email Template**:
```html
<h2>New Contact Form Submission</h2>
<p><strong>From:</strong> {name} ({email})</p>
<p><strong>Subject:</strong> {subject}</p>
<p><strong>Message:</strong></p>
<p>{message}</p>
```

### send-contact-reply
Sends admin reply to user via email.

**Path**: `supabase/functions/send-contact-reply/index.ts`

**Authentication**: Required (admin)

**Input**:
```typescript
{
  submissionId: string;
  message: string;
  includeAdminNotes: boolean;
  adminNotes?: string;
}
```

**Process**:
1. Authenticate user
2. Validate input
3. Fetch submission details
4. Get admin profile and app settings
5. Construct HTML email
6. Send via Resend (reply_to = user's email)
7. Log to email_audit_log
8. Insert reply record
9. Update submission (replied_at, replied_by, status = 'read')

**Email Template**:
```html
<div style="max-width: 600px; margin: 0 auto;">
  <img src="{logo_url}" style="max-height: 60px;" />
  <h2>Response to Your Message</h2>
  <p>Hello {user_name},</p>
  <p>{admin_reply_message}</p>
  {admin_notes_if_included}
  <hr />
  <p><strong>Your Original Message:</strong></p>
  <p>{original_message}</p>
</div>
```

### process-inbound-email
Processes inbound emails from Cloudflare Email Worker.

**Path**: `supabase/functions/process-inbound-email/index.ts`

**Webhook**: Cloudflare Email Routing → Worker → Edge function

**Authentication**: Webhook secret verification

**Input**:
```typescript
{
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  raw?: string;
}
```

**Process**:
1. Verify webhook secret (CLOUDFLARE_EMAIL_WEBHOOK_SECRET)
2. Parse email payload (Cloudflare or Resend format)
3. Extract sender email
4. Query recent submissions from sender (last 30 days)
5. Determine if reply or new submission:
   - **Reply**: subject contains "Re:" + matches existing subject
   - **New**: no matching submission found
6. Extract clean message content (remove quoted text, signatures, HTML)
7. Insert into appropriate table:
   - New → contact_form_submissions (source='email')
   - Reply → contact_form_replies (sender_type='user')
8. Create notification for admins
9. Return 200 (always, to prevent retries)

**Helper Functions**:
```typescript
extractEmail(from: string): string | null
extractMessageContent(content: string): string
parseRawEmail(raw: string): string
```

### test-contact-form-helper
Testing helper for E2E tests.

**Path**: `supabase/functions/test-contact-form-helper/index.ts`

**Actions**:
- `waitForSubmission`: Poll for submission by email
- `waitForReply`: Poll for reply by submission ID
- `getSubmission`: Fetch latest submission
- `cleanup`: Delete test submissions
- `simulateInboundEmail`: Trigger process-inbound-email

---

## FRONTEND COMPONENTS

### ContactForm
User-facing form with image upload.

**Path**: `src/components/ContactForm.tsx`

**Features**:
- Zod validation
- Auto-fill email if logged in
- Image compression (4.5MB limit)
- Upload to Supabase Storage (discussion-images bucket)
- Submit to database
- Trigger admin notification via edge function

**Validation Schema**:
```typescript
{
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
  message_type: z.enum(['general', 'support', 'feedback']),
  image: z.any().optional()
}
```

### ContactFormSettings
Admin settings configuration.

**Path**: `src/components/admin/ContactFormSettings.tsx`

**Editable Fields**:
- is_enabled: Toggle form on/off
- title, description: Public form text
- recipient_email: Admin notification recipient
- reply_from_name, reply_from_email: Reply email headers
- success_message: Post-submission message

### ContactSubmissions (MessagesManager)
Admin interface for viewing and replying to submissions.

**Path**: `src/components/admin/ContactSubmissions.tsx`

**Features**:
- **Unified Modal**: View original + history + reply in single dialog
- **Table Columns**: [checkbox][red-dot][date][name][subject][type][source][status][actions]
- **Red Dot Indicator**: Shows for new submissions OR unread user replies
- **Reply Button Badge**: Shows count of unread user replies
- **Filters**: Search by name/email/subject, filter by status/type/source
- **Bulk Actions**: Mark as read, change status, delete
- **Status Management**: new → read → replied → resolved
- **Real-time Updates**: Subscriptions for INSERT, UPDATE, DELETE events

**UI Patterns**:
- Numeric dates (M/d/yy)
- Truncated subjects (200px + tooltip)
- Primary reply button with badge if unread
- More dropdown (view, change status, delete)

---

## NOTIFICATIONS

### Types
```typescript
contact_form_submission: 'New Contact Form Submission'
contact_form_reply: 'User Replied to Your Message'
```

### Badge Counter Logic
**Hook**: `useContactFormCount`

**Optimization**: Single query + client-side filtering

```typescript
// Count = new submissions + submissions with unread user replies
const count = submissions.filter(s => 
  s.status === 'new' || s.unread_user_replies > 0
).length;
```

**Real-time Updates**:
```typescript
supabase
  .channel('contact_submissions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_form_submissions' }, handleChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_form_replies' }, handleChange)
  .subscribe();
```

### Clearing Notifications
When admin opens reply dialog:
```typescript
async function markContactNotificationsAsRead(submissionId: string) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`metadata->>submission_id.eq.${submissionId},metadata->>message_id.eq.${submissionId}`)
    .eq('is_read', false);
  
  // Also reset unread_user_replies counter
  await supabase
    .from('contact_form_submissions')
    .update({ unread_user_replies: 0 })
    .eq('id', submissionId);
}
```

---

## EMAIL CONFIGURATION

### Resend Setup
1. Sign up at https://resend.com
2. Verify domain at https://resend.com/domains
3. Create API key at https://resend.com/api-keys
4. Add secret: `RESEND_API_KEY`

**From Address**: `Best Day Ministries <contact@bestdayministries.org>`

### Cloudflare Email Routing Setup

**Purpose**: Capture user email replies and route to edge function.

**Step 1: Enable Email Routing**
1. Go to Cloudflare dashboard → Email → Email Routing
2. Add destination address (admin email)
3. Enable Email Routing for domain

**Step 2: Create Email Worker**
```javascript
// cloudflare-worker.js
export default {
  async email(message, env, ctx) {
    const emailData = {
      from: message.from,
      to: message.to,
      subject: message.headers.get('subject'),
      text: await streamToText(message.raw),
    };

    await fetch('https://nbvijawmjkycyweioglk.supabase.co/functions/v1/process-inbound-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': env.WEBHOOK_SECRET
      },
      body: JSON.stringify(emailData)
    });
  }
};
```

**Step 3: Configure Routing Rules**
- Match: `contact@bestdayministries.org`
- Action: Send to Worker
- Worker: `email-processor`

**Step 4: Add Webhook Secret**
Add `CLOUDFLARE_EMAIL_WEBHOOK_SECRET` to Supabase secrets.

---

## WORKFLOWS

### 1. New Submission (Form)
```
User fills form → ContactForm.onSubmit() →
  1. Validate with Zod
  2. Compress image (if any)
  3. Upload to Storage
  4. Insert contact_form_submissions (status='new', source='form')
  5. Call notify-admin-new-contact edge function
  6. Send email to admin via Resend
  7. Create notification for admins
  8. Show success toast
```

### 2. New Submission (Email)
```
User sends email → Cloudflare Email Routing →
  1. Trigger Worker
  2. POST to process-inbound-email
  3. Verify webhook secret
  4. Parse email content
  5. Insert contact_form_submissions (status='new', source='email')
  6. Create notification for admins
```

### 3. Admin Reply
```
Admin opens submission → ContactSubmissions modal →
  1. View original message + history
  2. Compose reply
  3. Click Send
  4. Call send-contact-reply edge function
  5. Send email to user via Resend (reply_to = user email)
  6. Insert contact_form_replies (sender_type='admin')
  7. Update submission (replied_at, replied_by, reply_message, status='read')
  8. Clear notifications
  9. Show success toast
```

### 4. User Reply (Email)
```
User replies to admin email → Cloudflare Email Routing →
  1. Trigger Worker
  2. POST to process-inbound-email
  3. Match to existing submission by subject
  4. Insert contact_form_replies (sender_type='user')
  5. Increment submission.unread_user_replies
  6. Create notification for admins
  7. Show red dot + badge in UI
```

### 5. Ongoing Conversation
```
Admin reply → User reply → Admin reply → ...
  - All replies stored in contact_form_replies
  - Linked via submission_id
  - Displayed in chronological order in modal
  - Color-coded: admin (muted bg), user (white bg)
```

---

## TESTING

### Integration Tests
**File**: `tests/integration/contact-form.test.tsx`

```typescript
// Email format validation
it('should validate email format', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(emailRegex.test('valid@example.com')).toBe(true);
  expect(emailRegex.test('invalid')).toBe(false);
});

// Badge count calculation
it('should calculate badge count', () => {
  const submissions = [
    { status: 'new', unread_user_replies: 0 },
    { status: 'read', unread_user_replies: 2 }
  ];
  const count = submissions.filter(s => 
    s.status === 'new' || s.unread_user_replies > 0
  ).length;
  expect(count).toBe(2);
});
```

### E2E Tests
**File**: `tests/e2e/archived/week6-final-archive/email-contact-form-resend.spec.ts`

**Test Helpers**: `tests/utils/resend-test-helper.ts`

```typescript
// Wait for submission to appear in DB
const submission = await waitForSubmission('test@example.com', {
  timeoutMs: 10000,
  pollIntervalMs: 500
});

// Verify submission data
await verifySubmission('test@example.com', {
  name: 'Test User',
  subject: 'Test Subject',
  message: 'Test message',
  status: 'new'
});

// Simulate inbound email reply
await simulateInboundEmail({
  from: 'user@example.com',
  to: 'contact@bestdayministries.org',
  subject: 'Re: Test Subject',
  text: 'User reply message'
});

// Wait for reply to be saved
const reply = await waitForReply(submissionId, {
  senderType: 'user',
  timeoutMs: 10000
});

// Cleanup
await cleanupTestSubmissions('test@example.com');
```

### Test Data Cleanup
**Edge Function**: `cleanup-test-data-unified`

Cleans up test data by email prefix pattern (`emailtest-*`).

---

## SECURITY & VALIDATION

### Input Sanitization
```typescript
// XSS prevention in edge functions
const sanitizedMessage = message
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

const sanitizedName = name
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

### Rate Limiting
Use `check_rate_limit()` function in edge functions:
```sql
SELECT check_rate_limit(auth.uid(), 'contact_form', 5, 60);
-- Max 5 requests per 60 minutes
```

### RLS Policies
- Public can INSERT submissions (form)
- Only admins can SELECT/UPDATE submissions
- Only admins can INSERT/SELECT replies
- Auth required for send-contact-reply

### Webhook Security
Verify webhook secret in process-inbound-email:
```typescript
const providedSecret = req.headers.get('x-webhook-secret');
const expectedSecret = Deno.env.get('CLOUDFLARE_EMAIL_WEBHOOK_SECRET');

if (providedSecret !== expectedSecret) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## TROUBLESHOOTING

### Issue: User replies not being captured
**Check**:
1. Cloudflare Email Routing enabled?
2. Worker deployed and bound to email routing?
3. Webhook secret matches in Worker and Supabase?
4. Edge function logs for errors

### Issue: Admin notifications not appearing
**Check**:
1. User has admin role?
2. Notification preferences enabled?
3. Real-time subscription active?
4. Check notifications table directly

### Issue: Emails not sending
**Check**:
1. RESEND_API_KEY configured?
2. Domain verified in Resend?
3. Check email_audit_log for errors
4. Check Resend dashboard for bounces

### Issue: Red dot not clearing
**Check**:
1. `markContactNotificationsAsRead()` called on dialog open?
2. `unread_user_replies` counter reset?
3. Real-time subscription receiving UPDATE events?

### Issue: Duplicate submissions
**Check**:
1. Form submit button disabled during submission?
2. process-inbound-email returning 200 (prevents retries)?
3. Check for multiple Worker triggers

---

## IMPLEMENTATION CHECKLIST

### Backend Setup
- [ ] Create database tables (contact_form_settings, contact_form_submissions, contact_form_replies)
- [ ] Set up RLS policies
- [ ] Create indexes for performance
- [ ] Add email_audit_log table
- [ ] Configure Resend (verify domain, create API key)
- [ ] Add RESEND_API_KEY secret
- [ ] Deploy edge functions (send-contact-email, send-contact-reply, process-inbound-email)

### Cloudflare Setup
- [ ] Enable Email Routing in Cloudflare
- [ ] Add destination email address
- [ ] Create Email Worker
- [ ] Configure routing rules
- [ ] Add CLOUDFLARE_EMAIL_WEBHOOK_SECRET to both Worker and Supabase
- [ ] Test email routing with test message

### Frontend Setup
- [ ] Create ContactForm component
- [ ] Create ContactFormSettings component
- [ ] Create ContactSubmissions/MessagesManager component
- [ ] Implement useContactFormCount hook
- [ ] Add notification badges to admin header
- [ ] Create unified reply modal
- [ ] Implement real-time subscriptions

### Testing
- [ ] Write integration tests for validation
- [ ] Write E2E tests for submission flow
- [ ] Write E2E tests for reply flow
- [ ] Test Cloudflare email routing
- [ ] Test notification badges
- [ ] Test cleanup functions

### Documentation
- [ ] Document Cloudflare setup steps
- [ ] Document Resend configuration
- [ ] Document edge function APIs
- [ ] Document notification system
- [ ] Create troubleshooting guide

---

## RELATED FILES

### Edge Functions
- `supabase/functions/send-contact-email/index.ts`
- `supabase/functions/send-contact-reply/index.ts`
- `supabase/functions/process-inbound-email/index.ts`
- `supabase/functions/test-contact-form-helper/index.ts`

### Frontend Components
- `src/components/ContactForm.tsx`
- `src/components/admin/ContactFormSettings.tsx`
- `src/components/admin/ContactSubmissions.tsx`

### Hooks
- `src/hooks/useContactFormCount.ts`

### Tests
- `tests/integration/contact-form.test.tsx`
- `tests/e2e/archived/week6-final-archive/email-contact-form-resend.spec.ts`
- `tests/utils/resend-test-helper.ts`

### Documentation
- `docs/CONTACT_FORM_SYSTEM.md`
- `docs/CONTACT_FORM_NOTIFICATIONS.md`
- `docs/CLOUDFLARE_EMAIL_ROUTING_SETUP.md`
- `docs/CONTACT_SUBMISSIONS_UI_GUIDE.md`

---

## SUPPORT

For implementation assistance, refer to:
- **Email System**: docs/EMAIL_SYSTEM_MASTER.md
- **Notification System**: docs/NOTIFICATION_SYSTEM_COMPLETE.md
- **Testing Strategy**: docs/TESTING_BEST_PRACTICES.md
