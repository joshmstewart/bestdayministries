# Ambassador Email System Documentation

## Overview

The Ambassador Email System allows designated users to send and receive emails as `ambassador@bestdayministries.org` from their personal email client, while maintaining full privacy and thread tracking. This system uses Resend SMTP for outbound emails and Cloudflare Email Routing + Resend webhooks for reply threading.

## Architecture

### Components

1. **Database Tables**
   - `ambassador_profiles` - Ambassador user profiles with email mapping
   - `ambassador_email_threads` - Email conversation threads
   - `ambassador_email_messages` - Individual messages in threads

2. **Edge Functions**
   - `handle-resend-webhook` - Tracks outbound emails and creates threads
   - `process-inbound-email` - Routes inbound replies to correct parties

3. **External Services**
   - Resend SMTP - For sending emails as `ambassador@bestdayministries.org`
   - Resend Webhooks - For tracking sent emails
   - Cloudflare Email Routing - For capturing inbound replies

## How It Works

### Workflow: Ambassador Sends New Email

1. **Ambassador configures email client** with Resend SMTP credentials:
   - SMTP Host: `smtp.resend.com`
   - Port: `587` (TLS) or `465` (SSL)
   - Username: `resend` (literal string)
   - Password: Your Resend API Key
   - From Address: `ambassador@bestdayministries.org`

2. **Ambassador composes and sends** email from their email client
   - The email goes through Resend's SMTP server
   - Resend delivers the email to the recipient

3. **Resend webhook fires** to `handle-resend-webhook` Edge Function
   - Verifies the sender is an active ambassador
   - Generates a unique thread key (e.g., `a1b2c3d4`)
   - Creates `ambassador_email_threads` record
   - Creates `ambassador_email_messages` record for outbound message
   - Thread reply address: `reply-a1b2c3d4@bestdayministries.org`

### Workflow: Recipient Replies

1. **Recipient clicks reply** in their email client
   - Reply-To address is `reply-{threadKey}@bestdayministries.org`
   - Email is sent to that unique address

2. **Cloudflare Email Routing captures** the inbound email
   - Routes to Cloudflare Worker
   - Worker forwards to `process-inbound-email` Edge Function

3. **Edge Function processes the reply:**
   - Extracts thread key from recipient address
   - Looks up the thread in database
   - Identifies sender as the original recipient
   - Logs inbound message
   - Forwards email to ambassador's personal inbox via Resend
   - Preserves Reply-To as `reply-{threadKey}@bestdayministries.org`

### Workflow: Ambassador Replies Back

1. **Ambassador replies** in their personal inbox
   - Replies to `reply-{threadKey}@bestdayministries.org`
   - Email is sent from their personal email

2. **Cloudflare Email Routing captures** the reply
   - Routes to `process-inbound-email` Edge Function

3. **Edge Function processes ambassador reply:**
   - Extracts thread key
   - Looks up thread
   - Identifies sender as ambassador's personal email
   - Logs outbound message
   - Sends email to recipient via Resend
   - From address: `ambassador@bestdayministries.org`
   - Reply-To: `reply-{threadKey}@bestdayministries.org`

## Setup Instructions

### Step 1: Create Ambassador Profile (Admin)

1. Navigate to Admin → Ambassadors (new tab)
2. Click "Add Ambassador"
3. Fill in:
   - Select User (user with ambassador role)
   - Ambassador Email: `ambassador@bestdayministries.org`
   - Personal Email: Ambassador's actual inbox
   - Display Name
4. Save

### Step 2: Configure Ambassador's Email Client

Provide these SMTP settings to the ambassador:

**For Gmail:**
1. Settings → Accounts → "Send mail as"
2. Add another email address
3. Enter: `ambassador@bestdayministries.org`
4. SMTP Settings:
   - Server: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: `[Your Resend API Key]`
   - TLS: Yes

**For Outlook/Apple Mail:**
- Add Account → Manual Setup
- SMTP settings as above

**For Other Clients:**
- Consult client documentation for custom SMTP setup
- Use credentials above

### Step 3: Configure Resend Webhook

1. Log into [Resend Dashboard](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Enter Endpoint URL:
   ```
   https://nbvijawmjkycyweioglk.supabase.co/functions/v1/handle-resend-webhook
   ```
4. Select Event: `email.sent`
5. Save

### Step 4: Verify Cloudflare Email Routing

The existing Cloudflare Email Routing setup will automatically capture replies to `reply-*@bestdayministries.org` addresses. No additional configuration needed if already set up for contact forms.

**Verify routing rule exists:**
- Match: `reply-*@bestdayministries.org`
- Action: Send to Worker `email-to-supabase`

## Privacy & Security

### What Admins Cannot See

- Ambassador email threads are **completely private**
- RLS policies prevent admins from viewing:
  - `ambassador_email_threads` table
  - `ambassador_email_messages` table
- Only the ambassador user can access their own threads

### What Ambassadors Can See

- Only their own email threads and messages
- Full conversation history
- Thread metadata (recipient, subject, timestamps)

### Access Control

```sql
-- Ambassadors can only view own threads
CREATE POLICY "Ambassadors can view own threads"
  ON ambassador_email_threads FOR SELECT
  USING (
    ambassador_id IN (
      SELECT id FROM ambassador_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins explicitly cannot view ambassador threads
CREATE POLICY "Admins cannot view ambassador threads"
  ON ambassador_email_threads FOR SELECT
  USING (false);
```

## Technical Details

### Thread Key Generation

Thread keys are the first 8 characters of a UUID v4:
```typescript
const threadKey = crypto.randomUUID().split('-')[0]; // e.g., "a1b2c3d4"
```

### Email Address Format

- **New emails FROM ambassador:** `ambassador@bestdayministries.org`
- **Thread reply addresses:** `reply-{threadKey}@bestdayministries.org`
- **Example:** `reply-a1b2c3d4@bestdayministries.org`

### Message Content Extraction

The `extractMessageContent()` function cleans emails:
- Removes HTML formatting
- Strips email signatures
- Removes quoted previous messages
- Filters MIME headers

## Limitations

### Email Client Limitations

1. **Must use SMTP for outbound**
   - Ambassador cannot send from web interface (only from email client)
   - All outbound emails must go through Resend SMTP

2. **Reply-To threading only**
   - System only tracks conversations started via SMTP
   - Direct emails to `ambassador@bestdayministries.org` go to normal contact form

### Threading Limitations

1. **One thread per initial email**
   - Each email sent creates a unique thread
   - Threads cannot be merged

2. **No CC/BCC support**
   - System only tracks 1:1 conversations
   - Multiple recipients not supported

## Troubleshooting

### Ambassador Not Receiving Replies

**Check:**
1. Verify Cloudflare Email Routing is active
2. Check Edge Function logs: `process-inbound-email`
3. Verify `ambassador_profiles.personal_email` is correct
4. Check spam folder in ambassador's personal inbox

### Recipient Not Receiving Ambassador Replies

**Check:**
1. Verify Resend API key is valid
2. Check Edge Function logs: `process-inbound-email`
3. Verify thread exists in database
4. Check Resend dashboard for delivery status

### Thread Not Created for New Email

**Check:**
1. Verify Resend webhook is configured
2. Check Edge Function logs: `handle-resend-webhook`
3. Verify ambassador profile exists and is active
4. Verify email was sent via Resend SMTP (not another provider)

### Email Client Cannot Send

**Check:**
1. SMTP credentials are correct (username: `resend`)
2. Using correct port (587 TLS or 465 SSL)
3. Resend API key is valid and not expired
4. From address is exactly `ambassador@bestdayministries.org`

## Database Schema

### ambassador_profiles

```sql
CREATE TABLE ambassador_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users,
  ambassador_email TEXT UNIQUE NOT NULL,
  personal_email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### ambassador_email_threads

```sql
CREATE TABLE ambassador_email_threads (
  id UUID PRIMARY KEY,
  ambassador_id UUID REFERENCES ambassador_profiles,
  thread_key TEXT UNIQUE NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### ambassador_email_messages

```sql
CREATE TABLE ambassador_email_messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES ambassador_email_threads,
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  message_content TEXT NOT NULL,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Related Documentation

- [Contact Form System](CONTACT_FORM_SYSTEM.md)
- [Cloudflare Email Routing Setup](CLOUDFLARE_EMAIL_ROUTING_SETUP.md)
- [Email System Master](EMAIL_SYSTEM_MASTER.md)
