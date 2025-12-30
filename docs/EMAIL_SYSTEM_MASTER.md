# EMAIL SYSTEM MASTER DOCUMENTATION

Complete reference for email creation, formatting, and sending.

## SYSTEM OVERVIEW

### Technology Stack
- **Email Provider**: Resend (resend.com)
- **Inbound Email**: Cloudflare Email Routing + Worker
- **Backend**: Supabase Edge Functions (Deno)
- **Rich Text Editor**: Tiptap with image cropping
- **Testing**: Playwright E2E with production parity

### Key Features
- Manual newsletter campaigns with rich content
- Automated trigger-based emails
- Contact form with two-way communication
- Tax-deductible sponsorship receipts
- Comprehensive audit logging
- Email template system with header/footer injection

---

## ARCHITECTURE

### Outbound Flow
```
Frontend → Edge Function → Resend API → Recipient → Audit Log
```

### Inbound Flow (Contact Replies)
```
Email → Cloudflare Routing → Worker → Edge Function → Database → Admin UI
```

---

## DATABASE SCHEMA

### newsletter_campaigns
```sql
CREATE TABLE newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  target_audience TEXT DEFAULT 'subscribers',
  target_roles user_role[],
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### newsletter_subscribers
```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
```

### campaign_templates
```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT DEFAULT 'marketing',
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  trigger_event TEXT,
  auto_send BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### newsletter_emails_log
```sql
CREATE TABLE newsletter_emails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES newsletter_campaigns(id),
  template_id UUID REFERENCES campaign_templates(id),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  html_content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  resend_email_id TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

### contact_form_submissions
```sql
CREATE TABLE contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### contact_form_replies
```sql
CREATE TABLE contact_form_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES contact_form_submissions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),
  sender_id UUID REFERENCES auth.users(id),
  resend_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### email_audit_log
```sql
CREATE TABLE email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
```

---

## EMAIL SERVICE SETUP

### Resend Configuration

1. **Create Account**: Sign up at https://resend.com
2. **Verify Domain**: Add DNS records (SPF, DKIM, DMARC)
3. **Create API Key**: Store as `RESEND_API_KEY` in Supabase

**DNS Records**:
```
TXT  _resend  [value from Resend]
MX   @        [value from Resend]  Priority: 10
TXT  @        v=spf1 include:_spf.resend.com ~all
CNAME resend._domainkey [value from Resend]
```

### Cloudflare Email Routing

1. **Enable**: Cloudflare Dashboard → Email → Email Routing
2. **Create Worker** (`email-to-supabase`):

```javascript
export default {
  async email(message, env, ctx) {
    const webhookUrl = "https://[project].supabase.co/functions/v1/process-inbound-email";
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": env.WEBHOOK_SECRET
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject"),
        text: await new Response(message.text).text(),
        inReplyTo: message.headers.get("in-reply-to")
      })
    });
  }
};
```

3. **Add Route**: `contact@domain.com` → Worker
4. **Set Secret**: Store same `WEBHOOK_SECRET` in Supabase

---

## EDGE FUNCTIONS

### send-newsletter
**File**: `supabase/functions/send-newsletter/index.ts`

```typescript
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// 1. Fetch campaign and subscribers
// 2. Get header/footer from app_settings
// 3. Inject: finalHtml = header + content + footer
// 4. Send via Resend
// 5. Log to newsletter_emails_log
```

### send-automated-campaign
**File**: `supabase/functions/send-automated-campaign/index.ts`

```typescript
// Request: { trigger_event, recipient_email, trigger_data }
// 1. Fetch template by trigger_event
// 2. Replace {{placeholders}} with trigger_data
// 3. Inject header/footer
// 4. Send and log
```

### send-contact-email
**File**: `supabase/functions/send-contact-email/index.ts`

```typescript
// Validation with Zod
const contactEmailSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000)
});

// Sanitize HTML to prevent XSS
const sanitized = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
```

### send-contact-reply
**File**: `supabase/functions/send-contact-reply/index.ts`

```typescript
// 1. Fetch submission details
// 2. Send email with reply-to set to admin
// 3. Save to contact_form_replies
// 4. Update submission status to 'replied'
```

### process-inbound-email
**File**: `supabase/functions/process-inbound-email/index.ts`

```typescript
// 1. Verify webhook secret (CLOUDFLARE_EMAIL_WEBHOOK_SECRET)
// 2. Extract original sender from raw email headers (From:, Reply-To:, X-Original-From:)
// 3. Filter out system emails (noreply@, @send.bestdayministries.org, notification subjects)
// 4. Match submission by In-Reply-To, References header, or email + subject
// 5. If no match, create new submission (ensures no emails are lost)
// 6. Save reply to contact_form_replies
// 7. Notify admins via notify-admins-new-message
```

**Original Sender Extraction (Added 2025-01-15):**
Cloudflare Email Routing can rewrite the `from` field. The function now extracts the true sender:
```typescript
function extractOriginalSender(raw: string): { email: string; name: string } | null {
  // Priority order: Reply-To > From > X-Original-From
  // Parses "Name <email@domain.com>" format
  // Returns null if no valid email found
}
```

### notify-admin-new-contact
**File**: `supabase/functions/notify-admin-new-contact/index.ts`

**Multi-Recipient Support (Added 2025-01-15):**
```typescript
// 1. Fetch submission details
// 2. Get recipient_email from contact_form_settings
// 3. Get all admin/owner user_ids from user_roles
// 4. Get email addresses from profiles table
// 5. Combine and deduplicate all recipients
// 6. Send single email to all recipients via Resend
// 7. Log to email_audit_log with all recipients
```

---

## FRONTEND COMPONENTS

### NewsletterManager
**File**: `src/components/admin/newsletter/NewsletterManager.tsx`

**Tabs**: Campaigns | Automated | Templates | Email Log | Subscribers | Analytics | Settings

### NewsletterCampaignDialog
**File**: `src/components/admin/newsletter/NewsletterCampaignDialog.tsx`

Form for creating/editing campaigns with RichTextEditor integration.

### RichTextEditor
**File**: `src/components/admin/newsletter/RichTextEditor.tsx`

Tiptap editor with:
- Text formatting (bold, italic, underline)
- Headings, lists, links
- Images with upload + crop
- YouTube embeds
- Color picker

### ImageCropDialog
**File**: `src/components/ImageCropDialog.tsx`

Crop images with aspect ratio selection (1:1, 16:9, 4:3, etc.)

### ContactForm
**File**: `src/components/ContactForm.tsx`

Public form with validation and graceful email failure handling.

### ContactSubmissions
**File**: `src/components/admin/ContactSubmissions.tsx`

Admin interface with unified modal for viewing submissions and replying.

---

## EMAIL TEMPLATES

### HTML Best Practices

**Use Table Layouts**:
```html
<table width="600" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding: 20px;">Content</td>
  </tr>
</table>
```

**Inline All Styles**:
```html
<p style="color: #333; font-size: 16px; margin: 0 0 16px 0;">Text</p>
```

**Images**:
```html
<img src="https://domain.com/logo.png" 
     alt="Logo" 
     width="200" 
     style="display: block; max-width: 100%;" />
```

### Basic Template Structure

```html
<!DOCTYPE html>
<html>
<body style="margin: 0; font-family: Arial, sans-serif; background: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" style="background: #fff;">
          <!-- Header -->
          <tr><td style="padding: 30px; background: #2563eb;">
            <img src="logo.png" alt="Logo" width="150" />
          </td></tr>
          
          <!-- Content -->
          <tr><td style="padding: 40px;">
            <h1 style="margin: 0 0 20px; color: #333;">Heading</h1>
            <p style="color: #666; line-height: 1.5;">Content...</p>
            <a href="#" style="display: inline-block; padding: 12px 24px; 
               background: #2563eb; color: #fff; text-decoration: none;">
              Button
            </a>
          </td></tr>
          
          <!-- Footer -->
          <tr><td style="padding: 20px; background: #f8f9fa; text-align: center;">
            <p style="color: #999; font-size: 14px;">Footer content</p>
            <a href="unsubscribe">Unsubscribe</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Header/Footer Injection

**Store in Database**:
```sql
UPDATE app_settings SET setting_value = jsonb_build_object(
  'newsletter_header', '<table>...header HTML...</table>',
  'newsletter_footer', '<table>...footer HTML...</table>'
) WHERE setting_key = 'newsletter_header';
```

**Inject in Edge Function**:
```typescript
const { data: settings } = await supabase
  .from('app_settings')
  .select('setting_value')
  .eq('setting_key', 'newsletter_header')
  .single();

const header = settings?.setting_value?.newsletter_header || '';
const footer = settings?.setting_value?.newsletter_footer || '';
const finalHtml = `${header}${emailContent}${footer}`;
```

### Placeholder Replacement

```typescript
function replacePlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}
```

---

## WORKFLOWS

### Manual Newsletter Campaign
1. Admin creates campaign in NewsletterCampaignDialog
2. Writes content with RichTextEditor
3. Sends test email (send-test-newsletter)
4. Sends campaign (send-newsletter)
5. Edge function injects header/footer and sends to all subscribers
6. Logs each send to newsletter_emails_log

### Automated Welcome Email
1. User signs up
2. App invokes send-automated-campaign with `trigger_event: 'welcome'`
3. Edge function fetches template, replaces {{placeholders}}
4. Sends email and logs

### Contact Form Flow
1. User submits ContactForm
2. Saves to contact_form_submissions
3. Invokes send-contact-email (notifies admin)
4. Admin replies via ContactSubmissions
5. Invokes send-contact-reply
6. User receives email
7. User replies via email
8. Cloudflare → Worker → process-inbound-email
9. Saved to contact_form_replies
10. Admin sees update in dashboard

---

## TESTING

### Production-Parity Pattern

Use real Resend API, verify database state (not email capture).

**Contact Form Test**:
```typescript
test('contact form submission and reply', async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  
  // Submit form
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="message"]', 'Test message');
  await page.click('button[type="submit"]');
  
  // Verify database
  const { data } = await supabase
    .from('contact_form_submissions')
    .select('*')
    .eq('email', testEmail)
    .single();
  
  expect(data).toBeDefined();
});
```

### Helper Functions
**File**: `tests/utils/resend-test-helper.ts`

```typescript
export async function waitForSubmission(supabase, email, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const { data } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .eq('email', email)
      .single();
    if (data) return data;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Submission not found');
}

export async function simulateInboundEmail(supabase, payload) {
  await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/process-inbound-email?test=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.CLOUDFLARE_EMAIL_WEBHOOK_SECRET
    },
    body: JSON.stringify(payload)
  });
}
```

---

## SECURITY

### Input Validation
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000)
});

function sanitizeHtml(input: string): string {
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

### Rate Limiting
```typescript
if (!await checkRateLimit(userId, 'send-contact-email', 5, 60)) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

### Webhook Security
```typescript
const secret = req.headers.get('x-webhook-secret');
if (secret !== Deno.env.get('CLOUDFLARE_EMAIL_WEBHOOK_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Unsubscribe (Required by CAN-SPAM)
```html
<a href="https://domain.com/unsubscribe?token={{unsubscribe_token}}">
  Unsubscribe
</a>
```

---

## TROUBLESHOOTING

### Email Not Sending
- Check `RESEND_API_KEY` is set
- Verify domain at https://resend.com/domains
- Check edge function logs: `supabase functions logs send-newsletter`
- Query failed sends: `SELECT * FROM newsletter_emails_log WHERE status = 'failed'`

### Emails Going to Spam
- Ensure SPF record: `v=spf1 include:_spf.resend.com ~all`
- Verify DKIM record from Resend
- Add DMARC: `v=DMARC1; p=quarantine`
- Include unsubscribe link
- Balance text/image ratio

### Images Not Loading
- Use absolute URLs: `https://domain.com/image.png`
- Set CORS on storage bucket
- Set explicit width/height attributes

### Contact Replies Not Threading
- Verify Cloudflare Worker forwards `In-Reply-To` header
- Check `resend_email_id` saved in contact_form_replies
- Ensure process-inbound-email matches by email or thread

### Large File Sizes
```typescript
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
if (file.size > MAX_SIZE) {
  toast.error('Image must be less than 5MB');
  return;
}

// Compress images before upload
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const MAX_WIDTH = 1920;
  
  let { width, height } = img;
  if (width > MAX_WIDTH) {
    height = (height * MAX_WIDTH) / width;
    width = MAX_WIDTH;
  }
  
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
  });
}
```

---

## QUICK REFERENCE

### Key Files

**Edge Functions**:
- `supabase/functions/send-newsletter/index.ts`
- `supabase/functions/send-automated-campaign/index.ts`
- `supabase/functions/send-contact-email/index.ts`
- `supabase/functions/send-contact-reply/index.ts`
- `supabase/functions/process-inbound-email/index.ts`

**Components**:
- `src/components/admin/newsletter/NewsletterManager.tsx`
- `src/components/admin/newsletter/NewsletterCampaignDialog.tsx`
- `src/components/admin/newsletter/RichTextEditor.tsx`
- `src/components/admin/ContactSubmissions.tsx`
- `src/components/ContactForm.tsx`

### Commands
```bash
# View logs
supabase functions logs send-newsletter --follow

# Test function
curl -X POST https://[project].supabase.co/functions/v1/send-newsletter \
  -H "Authorization: Bearer [key]" \
  -d '{"campaignId": "uuid"}'

# Run tests
npx playwright test tests/e2e/email-*.spec.ts
```

### Key Concepts
1. Always use absolute URLs in emails
2. Inline all styles - no CSS classes
3. Table-based layouts for compatibility
4. Header/footer injection from database
5. Production-parity testing with real Resend
6. Rate limiting on all endpoints
7. Always validate and sanitize input
8. Two-way communication via Cloudflare
9. Comprehensive audit logging
10. Graceful degradation if email fails

---

**End of Documentation** - Maintained as system evolves
