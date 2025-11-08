# EMAIL SYSTEM MASTER DOCUMENTATION

**Complete Reference Guide for Email Creation, Formatting, and Sending**

This document consolidates all email system documentation into a single comprehensive reference. Use this guide to understand and implement the complete email infrastructure.

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Email Service Configuration](#email-service-configuration)
5. [Edge Functions Reference](#edge-functions-reference)
6. [Frontend Components](#frontend-components)
7. [Email Templates & Formatting](#email-templates--formatting)
8. [Workflows & Use Cases](#workflows--use-cases)
9. [Testing Strategy](#testing-strategy)
10. [Security & Compliance](#security--compliance)
11. [Troubleshooting](#troubleshooting)
12. [Implementation Checklist](#implementation-checklist)

---

## SYSTEM OVERVIEW

### Purpose
Complete email system supporting:
- **Manual Email Campaigns**: Newsletter broadcasts with rich content
- **Automated Trigger Emails**: Event-based transactional emails
- **Contact Form Communication**: Two-way email with admin replies
- **Sponsorship Receipts**: Tax-deductible donation receipts
- **System Notifications**: User alerts and updates

### Technology Stack
- **Email Provider**: Resend (resend.com)
- **Inbound Email**: Cloudflare Email Routing + Worker
- **Backend**: Supabase Edge Functions (Deno)
- **Rich Text Editor**: Tiptap with image cropping
- **Testing**: Playwright E2E with production parity

### Key Features
- Rich HTML email templates with inline styles
- Header/footer injection for consistent branding
- Link tracking and analytics
- Comprehensive audit logging
- Production-parity testing
- Two-way email communication
- Image optimization and cropping
- Email compatibility for all major clients

---

## ARCHITECTURE

### Outbound Email Flow
```
Frontend Component
    ↓
Edge Function (Supabase)
    ↓
Resend API
    ↓
Recipient Inbox
    ↓
Email Audit Log (database)
```

### Inbound Email Flow (Contact Form Replies)
```
User sends email to contact@domain.com
    ↓
Cloudflare Email Routing receives
    ↓
Cloudflare Worker processes
    ↓
Webhook to process-inbound-email Edge Function
    ↓
Database: contact_form_replies table
    ↓
Admin dashboard updates in real-time
```

### Components Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  • NewsletterManager (campaigns)                        │
│  • ContactForm (public submissions)                     │
│  • EmailTemplatePreview (test sends)                    │
│  • RichTextEditor (content creation)                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Edge Functions Layer                   │
│  • send-newsletter                                       │
│  • send-automated-campaign                              │
│  • send-contact-email                                   │
│  • send-contact-reply                                   │
│  • send-sponsorship-receipt                             │
│  • process-inbound-email                                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    External Services                     │
│  • Resend API (outbound)                                │
│  • Cloudflare Email Routing (inbound)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     Database Layer                       │
│  • newsletter_emails_log (audit trail)                  │
│  • email_audit_log (universal log)                      │
│  • contact_form_submissions                             │
│  • contact_form_replies                                 │
│  • newsletter_campaigns                                 │
│  • campaign_templates                                   │
└─────────────────────────────────────────────────────────┘
```

---

## DATABASE SCHEMA

### Core Tables

#### newsletter_campaigns
```sql
CREATE TABLE newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  target_audience TEXT DEFAULT 'subscribers' CHECK (target_audience IN ('subscribers', 'members', 'non_subscribers', 'roles')),
  target_roles user_role[],
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### newsletter_subscribers
```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'website',
  metadata JSONB
);
```

#### campaign_templates
```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT DEFAULT 'marketing' CHECK (template_type IN ('marketing', 'transactional', 'notification')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  trigger_event TEXT,
  auto_send BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### newsletter_emails_log
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
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### contact_form_submissions
```sql
CREATE TABLE contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID REFERENCES auth.users(id),
  reply_message TEXT,
  source TEXT DEFAULT 'website',
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### contact_form_replies
```sql
CREATE TABLE contact_form_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES contact_form_submissions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),
  sender_id UUID REFERENCES auth.users(id),
  sender_email TEXT,
  resend_email_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### email_audit_log (Universal)
```sql
CREATE TABLE email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_user_id UUID REFERENCES auth.users(id),
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);
```

#### app_settings (Email Configuration)
```sql
-- Newsletter header/footer stored in app_settings.newsletter_header and newsletter_footer
-- Example structure:
{
  "logo_url": "https://...",
  "organization_name": "Organization Name",
  "organization_address": "123 Main St",
  "social_links": {
    "facebook": "https://...",
    "twitter": "https://..."
  }
}
```

### RLS Policies

#### newsletter_campaigns
```sql
-- Admins can manage all campaigns
CREATE POLICY "Admins can manage campaigns"
ON newsletter_campaigns
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()));

-- Users can view sent campaigns
CREATE POLICY "Users can view sent campaigns"
ON newsletter_campaigns
FOR SELECT
TO authenticated
USING (status = 'sent');
```

#### newsletter_subscribers
```sql
-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe"
ON newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can manage their own subscription
CREATE POLICY "Users can manage own subscription"
ON newsletter_subscribers
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR email = get_user_email(auth.uid()));

-- Admins can view all subscribers
CREATE POLICY "Admins can view all subscribers"
ON newsletter_subscribers
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));
```

#### newsletter_emails_log
```sql
-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON newsletter_emails_log
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Users can view their own email logs
CREATE POLICY "Users can view own logs"
ON newsletter_emails_log
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid() OR recipient_email = get_user_email(auth.uid()));
```

#### contact_form_submissions
```sql
-- Anyone can submit contact forms
CREATE POLICY "Anyone can submit"
ON contact_form_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view and manage all submissions
CREATE POLICY "Admins can manage"
ON contact_form_submissions
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()));
```

---

## EMAIL SERVICE CONFIGURATION

### Resend Setup

#### 1. Create Resend Account
1. Sign up at https://resend.com
2. Verify your email address
3. Add and verify your domain at https://resend.com/domains

#### 2. Domain Verification
Add these DNS records to your domain:
```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: MX
Name: @
Value: [provided by Resend]
Priority: 10

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: [provided by Resend]
```

#### 3. API Key
1. Go to https://resend.com/api-keys
2. Create API key with "Sending access"
3. Store as `RESEND_API_KEY` secret in Supabase

### Cloudflare Email Routing Setup (Inbound)

#### 1. Prerequisites
- Domain added to Cloudflare
- Active nameservers pointing to Cloudflare

#### 2. Enable Email Routing
1. Go to Cloudflare Dashboard → Email → Email Routing
2. Enable Email Routing (automatic MX record setup)
3. Verify domain ownership

#### 3. Create Email Worker
```javascript
// File: cloudflare-worker.js
export default {
  async email(message, env, ctx) {
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get("subject");
    
    // Extract message ID from headers for threading
    const messageId = message.headers.get("message-id");
    const inReplyTo = message.headers.get("in-reply-to");
    const references = message.headers.get("references");
    
    // Get raw email body
    const rawEmail = await new Response(message.raw).text();
    
    // Extract text content
    let textContent = "";
    if (message.text) {
      textContent = await new Response(message.text).text();
    }
    
    // Send to Supabase edge function
    const webhookUrl = "https://[your-project].supabase.co/functions/v1/process-inbound-email";
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": env.WEBHOOK_SECRET
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: textContent,
        messageId,
        inReplyTo,
        references,
        rawEmail
      })
    });
    
    if (!response.ok) {
      console.error("Failed to forward email:", await response.text());
    }
  }
};
```

#### 4. Configure Worker Environment Variables
Add to Worker settings:
- `WEBHOOK_SECRET`: Generate random string, store same value in Supabase

#### 5. Create Email Route
1. Cloudflare Dashboard → Email → Email Routing → Routes
2. Add route:
   - **Expression**: `contact@yourdomain.com`
   - **Action**: Send to Worker → `email-to-supabase`

---

## EDGE FUNCTIONS REFERENCE

### send-newsletter

**Purpose**: Send manual newsletter campaigns to subscribers

**File**: `supabase/functions/send-newsletter/index.ts`

**Authentication**: Required (admin only)

**Request Body**:
```typescript
{
  campaignId: string; // UUID of newsletter campaign
}
```

**Logic**:
1. Verify user is admin
2. Fetch campaign from database
3. Fetch app_settings for header/footer
4. Get target subscribers based on audience settings
5. Inject header and footer into email content
6. Send email to each subscriber via Resend
7. Log each send to `newsletter_emails_log`
8. Update campaign status to 'sent'

**Response**:
```typescript
{
  success: true,
  sentCount: number,
  failedCount: number,
  errors?: string[]
}
```

**Critical Implementation**:
```typescript
// Header/Footer Injection
const header = settings.newsletter_header || '';
const footer = settings.newsletter_footer || '';
const finalHtml = `${header}${campaign.content}${footer}`;

// Link tracking (optional)
const trackedHtml = addLinkTracking(finalHtml, campaignId, subscriberId);

// Send via Resend
const emailResponse = await resend.emails.send({
  from: "Newsletter <newsletter@yourdomain.com>",
  to: [subscriber.email],
  subject: campaign.subject,
  html: finalHtml
});

// Log to database
await supabase.from('newsletter_emails_log').insert({
  campaign_id: campaignId,
  recipient_email: subscriber.email,
  recipient_user_id: subscriber.user_id,
  subject: campaign.subject,
  html_content: finalHtml,
  status: 'sent',
  resend_email_id: emailResponse.data?.id
});
```

---

### send-automated-campaign

**Purpose**: Send triggered transactional emails

**File**: `supabase/functions/send-automated-campaign/index.ts`

**Authentication**: Required (system or admin)

**Request Body**:
```typescript
{
  trigger_event: string; // e.g., 'welcome', 'password_reset', 'receipt'
  recipient_email: string;
  recipient_user_id?: string;
  trigger_data?: {
    user_name?: string;
    reset_link?: string;
    amount?: string;
    [key: string]: any;
  };
}
```

**Logic**:
1. Fetch active template matching trigger_event
2. Replace placeholders in subject and content with trigger_data
3. Fetch header/footer from app_settings
4. Inject header/footer
5. Send via Resend
6. Log to both `automated_campaign_sends` and `newsletter_emails_log`

**Placeholder Syntax**:
```
{{user_name}} → replaced with trigger_data.user_name
{{reset_link}} → replaced with trigger_data.reset_link
{{amount}} → replaced with trigger_data.amount
```

**Example Template**:
```html
<h1>Welcome, {{user_name}}!</h1>
<p>Thank you for joining us. Click below to get started:</p>
<a href="{{dashboard_link}}">Go to Dashboard</a>
```

---

### send-contact-email

**Purpose**: Send contact form submission notification to admin

**File**: `supabase/functions/send-contact-email/index.ts`

**Authentication**: Not required (public endpoint)

**Request Body**:
```typescript
{
  name: string;
  email: string;
  subject?: string;
  message: string;
}
```

**Validation Schema (Zod)**:
```typescript
const contactEmailSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).toLowerCase(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000)
});
```

**Logic**:
1. Validate input with Zod
2. Sanitize HTML to prevent XSS
3. Format email with sender info
4. Send to admin via Resend with reply-to set to sender
5. Log to `email_audit_log`

**Email Format**:
```html
<h2>New Contact Form Submission</h2>
<p><strong>From:</strong> {name} ({email})</p>
<p><strong>Subject:</strong> {subject}</p>
<p><strong>Message:</strong></p>
<p>{sanitized_message}</p>
```

---

### send-contact-reply

**Purpose**: Admin reply to contact form submission

**File**: `supabase/functions/send-contact-reply/index.ts`

**Authentication**: Required (admin only)

**Request Body**:
```typescript
{
  submissionId: string;
  message: string;
  includeAdminNotes?: boolean;
}
```

**Logic**:
1. Authenticate user
2. Fetch submission details
3. Fetch admin profile for sender name
4. Format email with admin branding
5. Send via Resend
6. Save reply to `contact_form_replies`
7. Update submission status to 'replied'
8. Log to `email_audit_log`

**Critical Pattern**:
```typescript
// Set up reply threading
const emailResponse = await resend.emails.send({
  from: "Contact <contact@yourdomain.com>",
  to: [submission.email],
  reply_to: adminEmail,
  subject: `Re: ${submission.subject || 'Your inquiry'}`,
  html: formattedMessage
});

// Save reply for threading
await supabase.from('contact_form_replies').insert({
  submission_id: submissionId,
  message: message,
  sender_type: 'admin',
  sender_id: userId,
  resend_email_id: emailResponse.data?.id
});

// Update submission
await supabase.from('contact_form_submissions')
  .update({
    status: 'replied',
    replied_at: new Date().toISOString(),
    replied_by: userId,
    reply_message: message
  })
  .eq('id', submissionId);
```

---

### process-inbound-email

**Purpose**: Process inbound email replies from Cloudflare

**File**: `supabase/functions/process-inbound-email/index.ts`

**Authentication**: Webhook secret verification

**Request Body** (from Cloudflare Worker):
```typescript
{
  from: string;
  to: string;
  subject: string;
  text: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  rawEmail?: string;
}
```

**Logic**:
1. Verify webhook secret
2. Parse email addresses
3. Find matching contact submission by email threading
4. Extract message content (remove quoted replies)
5. Save to `contact_form_replies` as user reply
6. Create notification for admin
7. Update submission timestamp

**Threading Logic**:
```typescript
// Try to match by In-Reply-To header first
let submission = null;
if (inReplyTo) {
  const { data } = await supabase
    .from('contact_form_replies')
    .select('submission_id')
    .eq('resend_email_id', inReplyTo)
    .single();
  
  if (data) {
    submission = await supabase
      .from('contact_form_submissions')
      .select('*')
      .eq('id', data.submission_id)
      .single();
  }
}

// Fallback: match by sender email
if (!submission) {
  submission = await supabase
    .from('contact_form_submissions')
    .select('*')
    .eq('email', fromEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}
```

---

### send-sponsorship-receipt

**Purpose**: Send tax-deductible donation receipts

**File**: `supabase/functions/send-sponsorship-receipt/index.ts`

**Authentication**: Required (system or admin)

**Request Body**:
```typescript
{
  receiptId: string; // UUID of sponsorship_receipt
}
```

**Logic**:
1. Fetch receipt with sponsorship details
2. Fetch organization info (name, EIN, address)
3. Generate PDF receipt
4. Format email with receipt details
5. Attach PDF
6. Send via Resend
7. Update receipt status to 'sent'
8. Log to `newsletter_emails_log`

**Email Format**:
```html
<h2>Thank You for Your Donation</h2>
<p>Dear {donor_name},</p>
<p>Thank you for your tax-deductible donation of ${amount} to {organization}.</p>
<p><strong>Receipt Number:</strong> {receipt_number}</p>
<p><strong>Tax Year:</strong> {tax_year}</p>
<p><strong>Date:</strong> {date}</p>
<p>Your PDF receipt is attached.</p>
<p>{organization_footer}</p>
```

---

## FRONTEND COMPONENTS

### NewsletterManager

**File**: `src/components/admin/newsletter/NewsletterManager.tsx`

**Purpose**: Main admin interface for email system

**Tabs**:
1. **Campaigns**: Manual campaign creation and management
2. **Automated**: Triggered email template management
3. **Templates**: Reusable content templates
4. **Email Log**: Audit trail of all sent emails
5. **Subscribers**: Subscriber list management
6. **Analytics**: Open rates, click rates (if implemented)
7. **Settings**: Header, footer, organization info

**Key Features**:
- Tab-based navigation with badge counts
- Real-time updates
- Search and filter capabilities
- Mobile responsive with horizontal scrolling tabs

---

### NewsletterCampaignDialog

**File**: `src/components/admin/newsletter/NewsletterCampaignDialog.tsx`

**Purpose**: Create/edit email campaigns

**Form Fields**:
- Title (internal reference)
- Subject line
- Preview text
- Target audience (subscribers, all members, roles)
- Scheduled send time
- Email content (rich text editor)

**Key Features**:
- Template selection to pre-fill content
- Desktop/mobile preview toggle
- Draft saving
- Schedule for later or send immediately
- Integration with RichTextEditor

**State Management**:
```typescript
const [formData, setFormData] = useState({
  title: '',
  subject: '',
  preview_text: '',
  content: '',
  target_audience: 'subscribers',
  target_roles: [],
  scheduled_for: null
});
```

---

### RichTextEditor

**File**: `src/components/admin/newsletter/RichTextEditor.tsx`

**Purpose**: WYSIWYG email content editor

**Features**:
- Text formatting (bold, italic, underline, strikethrough)
- Headings (H1, H2, H3)
- Text alignment (left, center, right)
- Lists (bullet, numbered)
- Links with URL input
- Images with upload and crop
- YouTube video embeds
- Text color picker
- Highlight color
- Code blocks
- Horizontal rules

**Tiptap Extensions**:
```typescript
const extensions = [
  StarterKit,
  Image,
  Link.configure({ openOnClick: false }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
  TextStyle,
  Color,
  Highlight,
  Youtube.configure({ controls: false }),
  Placeholder.configure({ placeholder: 'Start typing...' })
];
```

**Image Handling**:
1. User uploads image
2. Image opens in crop dialog
3. User selects aspect ratio and crops
4. Cropped image uploaded to Supabase Storage
5. Public URL inserted into editor

**Critical Pattern - Email Compatibility**:
```typescript
// Convert editor HTML to email-safe HTML
const emailHtml = editor.getHTML()
  .replace(/<img /g, '<img style="max-width: 100%; height: auto;" ')
  .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ');
```

---

### ImageCropDialog

**File**: `src/components/ImageCropDialog.tsx`

**Purpose**: Crop images for email compatibility

**Features**:
- Drag to reposition
- Zoom slider
- Aspect ratio selection (1:1, 16:9, 4:3, etc.)
- Real-time preview
- CORS-safe image loading

**Usage Pattern**:
```typescript
const [aspectRatioKey, setAspectRatioKey] = useState<'16:9'>('16:9');

<ImageCropDialog
  open={cropDialogOpen}
  onOpenChange={setCropDialogOpen}
  imageUrl={imageToCrop}
  onCropComplete={handleCroppedImage}
  allowAspectRatioChange={true}
  selectedRatioKey={aspectRatioKey}
  onAspectRatioKeyChange={setAspectRatioKey}
  title="Crop Email Image"
/>
```

---

### CampaignTemplates

**File**: `src/components/admin/newsletter/CampaignTemplates.tsx`

**Purpose**: Manage automated email templates

**Features**:
- List all templates with type badges
- Toggle active/inactive status
- Send test email to self
- Preview template
- Edit template
- Delete template
- Create new templates

**Template Types**:
- **Marketing**: Promotional campaigns
- **Transactional**: Order confirmations, receipts
- **Notification**: System alerts, updates

**Trigger Events**:
- `welcome`: New user signup
- `password_reset`: Password reset request
- `receipt`: Sponsorship receipt
- `event_reminder`: Upcoming event
- Custom triggers

---

### EmailTemplatePreview

**File**: `src/components/admin/EmailTemplatePreview.tsx`

**Purpose**: Preview and test notification templates

**Features**:
- Dropdown selector for template type
- Live HTML preview in iframe
- Send test email button
- Shows subject, type, and link

**Template Examples**:
```typescript
const templateExamples = [
  {
    type: 'pending_approval',
    subject: 'Content Pending Approval',
    title: 'New Content Needs Your Approval',
    message: 'A discussion post is waiting for your review.',
    link: '/admin/moderation'
  },
  {
    type: 'new_sponsor_message',
    subject: 'New Message from Sponsor',
    title: 'You have a new message',
    message: 'Your sponsor has sent you a message.',
    link: '/guardian-links'
  }
  // ... more templates
];
```

---

### ContactForm

**File**: `src/components/ContactForm.tsx`

**Purpose**: Public contact form submission

**Features**:
- Form validation with Zod
- Auto-load settings from database
- Graceful degradation if email fails
- Success/error toast notifications

**Implementation**:
```typescript
const handleSubmit = async (data: ContactFormData) => {
  try {
    // Save to database first (always works)
    const { error: dbError } = await supabase
      .from('contact_form_submissions')
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        source: 'website'
      });
    
    if (dbError) throw dbError;
    
    // Try to send email (may fail gracefully)
    try {
      await supabase.functions.invoke('send-contact-email', {
        body: data
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't throw - we still saved to database
    }
    
    toast.success('Message sent! We\'ll get back to you soon.');
    reset();
  } catch (error) {
    toast.error('Failed to send message. Please try again.');
  }
};
```

---

### ContactSubmissions

**File**: `src/components/admin/ContactSubmissions.tsx`

**Purpose**: Admin interface for contact form management

**Features**:
- Table view with sorting and filtering
- Status indicators (new, read, replied)
- Unified modal for view + reply
- Email threading history
- Real-time updates via Supabase subscription

**Table Columns**:
- Checkbox (bulk actions)
- Status indicator (red dot for new/unread)
- Date (M/d/yy format)
- Name
- Subject (truncated with tooltip)
- Type badge
- Source
- Status badge
- Actions (reply, view, status, delete)

**Unified Modal Structure**:
```
┌─────────────────────────────────────┐
│  [Close Button]                     │
│                                     │
│  ORIGINAL MESSAGE                   │
│  ┌───────────────────────────────┐ │
│  │ Name, Email, Date             │ │
│  │ Subject                       │ │
│  │ Message content               │ │
│  └───────────────────────────────┘ │
│                                     │
│  CONVERSATION HISTORY               │
│  ┌───────────────────────────────┐ │
│  │ [Admin] Reply 1               │ │
│  │ [User] Reply 2                │ │
│  └───────────────────────────────┘ │
│                                     │
│  COMPOSE REPLY                      │
│  ┌───────────────────────────────┐ │
│  │ [Textarea]                    │ │
│  │ [Include admin notes toggle]  │ │
│  │ [Send Reply Button]           │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## EMAIL TEMPLATES & FORMATTING

### HTML Email Best Practices

#### Use Table Layouts
```html
<!-- Good: Table-based layout -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px; background-color: #ffffff;">
            Content here
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Bad: Flexbox/Grid -->
<div style="display: flex;">...</div>
```

#### Inline All Styles
```html
<!-- Good: Inline styles -->
<p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
  Text content
</p>

<!-- Bad: CSS classes -->
<p class="text-gray-700">Text content</p>
```

#### Image Best Practices
```html
<img 
  src="https://yourdomain.com/images/logo.png"
  alt="Company Logo"
  width="200"
  height="60"
  style="display: block; max-width: 100%; height: auto; border: 0;"
/>
```

Key rules:
- Use absolute URLs
- Always include `alt` text
- Set explicit `width` and `height`
- Use `display: block` to prevent spacing issues
- Set `border: 0`
- Max width 600px for email body

### Email Template Structure

#### Basic Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Subject</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #2563eb;">
              <img src="https://yourdomain.com/logo.png" alt="Logo" width="150" style="display: block;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Email Heading</h1>
              <p style="margin: 0 0 16px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Email content goes here...
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #2563eb;">
                    <a href="https://yourdomain.com/action" 
                       style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                      Call to Action
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; text-align: center;">
                Company Name<br />
                123 Main St, City, State 12345
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                <a href="https://yourdomain.com/unsubscribe" style="color: #2563eb; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>
```

### Header/Footer Injection Pattern

#### Store in Database
```sql
UPDATE app_settings
SET setting_value = jsonb_build_object(
  'newsletter_header', '<table>...header HTML...</table>',
  'newsletter_footer', '<table>...footer HTML...</table>'
)
WHERE setting_key = 'newsletter_header';
```

#### Inject in Edge Function
```typescript
// Fetch settings
const { data: settings } = await supabase
  .from('app_settings')
  .select('setting_value')
  .eq('setting_key', 'newsletter_header')
  .single();

const header = settings?.setting_value?.newsletter_header || '';
const footer = settings?.setting_value?.newsletter_footer || '';

// Inject
const finalHtml = `${header}${emailContent}${footer}`;
```

### Placeholder Replacement

```typescript
function replacePlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

// Usage
const emailHtml = replacePlaceholders(template, {
  user_name: 'John Doe',
  reset_link: 'https://example.com/reset/token123',
  amount: '$50.00'
});
```

---

## WORKFLOWS & USE CASES

### Manual Newsletter Campaign

```
1. Admin creates campaign
   ├─> NewsletterCampaignDialog
   ├─> Select template (optional)
   ├─> Write content with RichTextEditor
   ├─> Upload and crop images
   ├─> Select target audience
   └─> Save as draft

2. Admin previews campaign
   ├─> Desktop preview
   └─> Mobile preview

3. Admin sends test email
   ├─> CampaignActions component
   ├─> Invokes send-test-newsletter
   └─> Receives test in own inbox

4. Admin schedules or sends campaign
   ├─> CampaignActions component
   ├─> If scheduled: sets scheduled_for timestamp
   └─> If immediate: invokes send-newsletter

5. Edge function processes
   ├─> Fetches campaign
   ├─> Fetches subscribers
   ├─> Injects header/footer
   ├─> Sends via Resend (batched)
   ├─> Logs each send
   └─> Updates campaign status

6. Users receive emails
   └─> Opens, clicks (tracked if implemented)
```

### Automated Welcome Email

```
1. User signs up
   └─> handle_new_user() trigger runs

2. Application invokes automated campaign
   ├─> POST /send-automated-campaign
   └─> Body: {
         trigger_event: 'welcome',
         recipient_email: user.email,
         recipient_user_id: user.id,
         trigger_data: {
           user_name: user.name,
           dashboard_link: 'https://...'
         }
       }

3. Edge function processes
   ├─> Fetches welcome template
   ├─> Replaces {{user_name}} and {{dashboard_link}}
   ├─> Injects header/footer
   ├─> Sends via Resend
   ├─> Logs to automated_campaign_sends
   └─> Logs to newsletter_emails_log

4. User receives welcome email
```

### Contact Form Submission & Reply

```
1. User submits contact form
   ├─> ContactForm component
   ├─> Saves to contact_form_submissions
   ├─> Invokes send-contact-email
   └─> Admin receives notification email

2. Admin views submission
   ├─> ContactSubmissions component
   ├─> Opens unified modal
   └─> Sees original message

3. Admin replies
   ├─> Writes reply in modal
   ├─> Clicks "Send Reply"
   ├─> Invokes send-contact-reply
   ├─> Reply saved to contact_form_replies
   └─> User receives email with reply

4. User replies via email
   ├─> Sends email to contact@domain.com
   ├─> Cloudflare Email Routing receives
   ├─> Cloudflare Worker forwards
   ├─> process-inbound-email edge function
   ├─> Matches submission by email threading
   ├─> Saves to contact_form_replies
   ├─> Notifies admin
   └─> Admin sees update in dashboard

5. Conversation continues
   └─> Threading maintained via In-Reply-To headers
```

### Sponsorship Receipt

```
1. Donation processed
   └─> Stripe webhook creates sponsorship

2. Receipt generation triggered
   ├─> Manual: Admin clicks "Send Receipt"
   └─> Automatic: Cron job runs monthly

3. Edge function generates receipt
   ├─> Fetches sponsorship and receipt data
   ├─> Fetches organization info (EIN, address)
   ├─> Generates PDF receipt
   ├─> Formats email with receipt details
   └─> Attaches PDF

4. Receipt sent
   ├─> Sent via Resend
   ├─> Logged to newsletter_emails_log
   ├─> Receipt status updated to 'sent'
   └─> Donor receives email with PDF
```

---

## TESTING STRATEGY

### Production-Parity Pattern

**Principle**: Use real email service (Resend) in tests, verify database state

**Why Not Mock?**
- Catches integration issues
- Tests actual API contracts
- Validates error handling
- Ensures email deliverability

### Test Categories

#### Contact Form Tests (5 tests)
**File**: `tests/e2e/email-contact-form-resend.spec.ts`

Pattern:
```typescript
test('should send contact form and admin can reply', async ({ page }) => {
  const testRunId = Date.now().toString();
  const testEmail = `emailtest-${testRunId}@example.com`;
  
  // 1. Submit contact form
  await page.goto('/contact');
  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="message"]', 'Test message');
  await page.click('button[type="submit"]');
  
  // 2. Wait for database state
  await waitForSubmission(supabase, testEmail, 5000);
  
  // 3. Verify submission in database
  const { data: submission } = await supabase
    .from('contact_form_submissions')
    .select('*')
    .eq('email', testEmail)
    .single();
  
  expect(submission).toBeDefined();
  expect(submission.name).toBe('Test User');
  
  // 4. Simulate inbound reply
  await simulateInboundEmail(supabase, {
    from: testEmail,
    to: 'contact@domain.com',
    subject: 'Re: Your inquiry',
    text: 'Thanks for the reply!',
    inReplyTo: submission.resend_email_id
  });
  
  // 5. Verify reply in database
  await waitForReply(supabase, submission.id, 5000);
});
```

#### Other Email Tests (17 tests)
Pattern: Authenticated client with test users

```typescript
test('should send approval notification', async ({ page }) => {
  // 1. Seed test data
  const { guardian, bestie } = await seedEmailTestData();
  
  // 2. Trigger action requiring email
  await page.goto('/admin/moderation');
  await page.click(`[data-post-id="${testPost.id}"] button.approve`);
  
  // 3. Verify database state
  const { data: notification } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', guardian.id)
    .eq('type', 'approval_decision')
    .single();
  
  expect(notification).toBeDefined();
  
  // 4. Verify email log
  const { data: emailLog } = await supabase
    .from('newsletter_emails_log')
    .select('*')
    .eq('recipient_email', guardian.email)
    .single();
  
  expect(emailLog.status).toBe('sent');
});
```

### Helper Functions

**File**: `tests/utils/resend-test-helper.ts`

```typescript
export async function waitForSubmission(
  supabase: SupabaseClient,
  email: string,
  timeout: number = 5000
): Promise<ContactFormSubmission> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const { data } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) return data;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Submission not found for ${email} within ${timeout}ms`);
}

export async function simulateInboundEmail(
  supabase: SupabaseClient,
  payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    inReplyTo?: string;
  }
): Promise<void> {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/process-inbound-email?test=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.CLOUDFLARE_EMAIL_WEBHOOK_SECRET!
      },
      body: JSON.stringify(payload)
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to simulate inbound email: ${await response.text()}`);
  }
}

export async function cleanupTestSubmissions(
  supabase: SupabaseClient,
  emailPrefix: string
): Promise<void> {
  await supabase
    .from('contact_form_submissions')
    .delete()
    .like('email', `${emailPrefix}%`);
}
```

### CI/CD Configuration

**File**: `.github/workflows/email-tests.yml`

```yaml
name: Email Tests

on:
  workflow_dispatch:
    inputs:
      run_email_tests:
        description: 'Run email tests'
        required: true
        type: boolean

jobs:
  email-tests:
    if: ${{ github.event.inputs.run_email_tests == 'true' }}
    runs-on: ubuntu-latest
    timeout-minutes: 45
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Seed test data
        run: |
          npx supabase functions invoke seed-email-test-data
      
      - name: Run email tests
        run: |
          npx playwright test tests/e2e/email-*.spec.ts --project=chromium
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          CLOUDFLARE_EMAIL_WEBHOOK_SECRET: ${{ secrets.CLOUDFLARE_EMAIL_WEBHOOK_SECRET }}
      
      - name: Cleanup test data
        if: always()
        run: |
          npx supabase functions invoke cleanup-email-test-data
```

### Test Data Cleanup

**Edge Function**: `cleanup-email-test-data`

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { emailPrefix } = await req.json();
  
  // Delete test contact submissions (cascades to replies)
  await supabase
    .from('contact_form_submissions')
    .delete()
    .like('email', `${emailPrefix}%`);
  
  // Delete test newsletter logs
  await supabase
    .from('newsletter_emails_log')
    .delete()
    .like('recipient_email', `${emailPrefix}%`);
  
  // Delete test email audit logs
  await supabase
    .from('email_audit_log')
    .delete()
    .like('recipient_email', `${emailPrefix}%`);
  
  return new Response(JSON.stringify({ success: true }));
});
```

---

## SECURITY & COMPLIANCE

### Input Validation

**Always validate and sanitize user input**:

```typescript
import { z } from 'zod';

const emailSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).toLowerCase(),
  message: z.string().trim().min(1).max(5000)
});

// Sanitize HTML
function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

### Rate Limiting

Implement rate limiting for email endpoints:

```typescript
async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMinutes: number = 60
): Promise<boolean> {
  const { data } = await supabase.rpc('check_rate_limit', {
    _user_id: userId,
    _endpoint: endpoint,
    _max_requests: maxRequests,
    _window_minutes: windowMinutes
  });
  
  return data;
}

// Usage in edge function
if (!await checkRateLimit(userId, 'send-contact-email', 5, 60)) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
    { status: 429 }
  );
}
```

### Webhook Security

Verify webhook signatures:

```typescript
// Cloudflare Worker → Supabase verification
const webhookSecret = req.headers.get('x-webhook-secret');
if (webhookSecret !== Deno.env.get('CLOUDFLARE_EMAIL_WEBHOOK_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Unsubscribe Handling

**Required by law (CAN-SPAM Act)**:

Every marketing email must include unsubscribe link:

```html
<a href="https://yourdomain.com/unsubscribe?token={{unsubscribe_token}}">
  Unsubscribe
</a>
```

Edge function:
```typescript
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  // Decode token to get email/user_id
  const { email } = decodeToken(token);
  
  // Update subscriber status
  await supabase
    .from('newsletter_subscribers')
    .update({ 
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString()
    })
    .eq('email', email);
  
  return new Response('You have been unsubscribed.', {
    headers: { 'Content-Type': 'text/html' }
  });
});
```

### PII Protection

- Store minimal personal data
- Encrypt sensitive fields
- Implement data retention policies
- Allow users to export/delete data (GDPR)

### Audit Logging

Log all email sends for compliance:

```typescript
await supabase.from('email_audit_log').insert({
  resend_email_id: emailResponse.data?.id,
  email_type: 'campaign',
  recipient_email: email,
  recipient_user_id: userId,
  from_email: 'newsletter@domain.com',
  subject: subject,
  html_content: emailHtml,
  status: 'sent',
  sent_at: new Date().toISOString(),
  metadata: { campaign_id: campaignId }
});
```

---

## TROUBLESHOOTING

### Email Not Sending

**Check 1: Resend API Key**
```bash
# Verify secret is set
supabase secrets list | grep RESEND_API_KEY
```

**Check 2: Domain Verification**
- Go to https://resend.com/domains
- Verify all DNS records are green
- Check SPF, DKIM, MX records

**Check 3: Email Logs**
```sql
SELECT * FROM newsletter_emails_log
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 10;
```

**Check 4: Edge Function Logs**
```bash
supabase functions logs send-newsletter
```

### Emails Going to Spam

**Fix 1: SPF Record**
```
v=spf1 include:_spf.resend.com ~all
```

**Fix 2: DKIM**
Ensure DKIM record from Resend is added to DNS

**Fix 3: DMARC**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

**Fix 4: Content Quality**
- Avoid spam trigger words
- Balance image-to-text ratio
- Include unsubscribe link
- Use proper from name and email

### Images Not Loading

**Issue**: Relative URLs in emails

**Fix**: Use absolute URLs
```typescript
// Bad
<img src="/images/logo.png" />

// Good
<img src="https://yourdomain.com/images/logo.png" />
```

**Issue**: CORS blocking images

**Fix**: Set proper CORS on storage bucket
```typescript
await supabase.storage
  .from('email-images')
  .updateBucket({
    public: true,
    allowedMimeTypes: ['image/*']
  });
```

### Contact Form Replies Not Threading

**Check 1: Message-ID Headers**
Ensure Resend returns message-id in response

**Check 2: Cloudflare Worker**
Verify In-Reply-To and References headers are forwarded

**Check 3: Database Matching**
```sql
SELECT 
  cfr.id,
  cfr.submission_id,
  cfr.resend_email_id,
  cfs.email
FROM contact_form_replies cfr
JOIN contact_form_submissions cfs ON cfs.id = cfr.submission_id
WHERE cfr.resend_email_id IS NOT NULL;
```

### Rich Text Editor Images Large File Size

**Fix 1: Compress Before Upload**
```typescript
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  
  // Max dimensions
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1920;
  
  let width = img.width;
  let height = img.height;
  
  if (width > MAX_WIDTH) {
    height = (height * MAX_WIDTH) / width;
    width = MAX_WIDTH;
  }
  if (height > MAX_HEIGHT) {
    width = (width * MAX_HEIGHT) / height;
    height = MAX_HEIGHT;
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
  });
}
```

**Fix 2: Set Max File Size**
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_FILE_SIZE) {
  toast.error('Image must be less than 5MB');
  return;
}
```

### Newsletter Not Reaching All Subscribers

**Check 1: Batch Sending**
```typescript
// Send in batches of 100
const BATCH_SIZE = 100;
for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
  const batch = subscribers.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(sendEmail));
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
}
```

**Check 2: Error Handling**
```typescript
const results = await Promise.allSettled(
  subscribers.map(sub => sendEmail(sub))
);

const failures = results.filter(r => r.status === 'rejected');
console.error('Failed to send to:', failures);
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Setup (1-2 hours)

- [ ] Create Resend account
- [ ] Verify domain in Resend
- [ ] Add SPF, DKIM, DMARC DNS records
- [ ] Create Resend API key
- [ ] Store `RESEND_API_KEY` in Supabase secrets
- [ ] Test: Send test email via Resend dashboard

### Phase 2: Database (1-2 hours)

- [ ] Run migration for all email tables
- [ ] Create newsletter_campaigns table
- [ ] Create newsletter_subscribers table
- [ ] Create campaign_templates table
- [ ] Create newsletter_emails_log table
- [ ] Create contact_form_submissions table
- [ ] Create contact_form_replies table
- [ ] Create email_audit_log table
- [ ] Set up RLS policies for all tables
- [ ] Test: Insert test records via SQL

### Phase 3: Edge Functions (3-4 hours)

- [ ] Create send-newsletter function
- [ ] Create send-automated-campaign function
- [ ] Create send-contact-email function
- [ ] Create send-contact-reply function
- [ ] Test each function with curl/Postman
- [ ] Add error handling and logging
- [ ] Implement rate limiting
- [ ] Test: Send test emails via functions

### Phase 4: Cloudflare (1-2 hours)

- [ ] Set up Cloudflare account
- [ ] Add domain to Cloudflare
- [ ] Enable Email Routing
- [ ] Create Cloudflare Worker
- [ ] Add WEBHOOK_SECRET to Worker
- [ ] Create email route to Worker
- [ ] Create process-inbound-email function
- [ ] Test: Send email to contact@domain.com

### Phase 5: Frontend - Newsletter (4-6 hours)

- [ ] Create NewsletterManager component
- [ ] Create NewsletterCampaignDialog
- [ ] Integrate RichTextEditor
- [ ] Implement image upload and crop
- [ ] Create CampaignActions component
- [ ] Create CampaignTemplates component
- [ ] Create newsletter subscriber management
- [ ] Test: Create and send test campaign

### Phase 6: Frontend - Contact Form (2-3 hours)

- [ ] Create ContactForm component
- [ ] Create ContactSubmissions component
- [ ] Implement unified modal for replies
- [ ] Add real-time updates
- [ ] Test: Submit form and reply

### Phase 7: Email Templates (2-3 hours)

- [ ] Design email header template
- [ ] Design email footer template
- [ ] Store in app_settings
- [ ] Create reusable email layouts
- [ ] Test in multiple email clients
- [ ] Ensure mobile responsiveness

### Phase 8: Testing (3-4 hours)

- [ ] Write E2E tests for contact form
- [ ] Write E2E tests for newsletters
- [ ] Write E2E tests for automated emails
- [ ] Set up test data seeding
- [ ] Set up test data cleanup
- [ ] Configure CI/CD for email tests
- [ ] Test: Run full test suite

### Phase 9: Monitoring & Logging (2-3 hours)

- [ ] Set up email audit logging
- [ ] Create admin dashboard for email logs
- [ ] Add search and filter to logs
- [ ] Implement email analytics (opens, clicks)
- [ ] Set up error alerting
- [ ] Test: Review logs after sending emails

### Phase 10: Security & Compliance (2-3 hours)

- [ ] Implement rate limiting
- [ ] Add input validation to all forms
- [ ] Sanitize HTML content
- [ ] Add unsubscribe functionality
- [ ] Create privacy policy for email
- [ ] Add GDPR data export/delete
- [ ] Test: Attempt XSS, rate limit bypass

### Total Estimated Time: 20-30 hours

---

## QUICK REFERENCE

### Essential Files

**Documentation**:
- `docs/EMAIL_SYSTEM_MASTER.md` (this file)
- `docs/NEWSLETTER_SYSTEM.md`
- `docs/CONTACT_FORM_SYSTEM.md`
- `docs/CLOUDFLARE_EMAIL_ROUTING_SETUP.md`

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
- `src/components/ImageCropDialog.tsx`

### Common Commands

```bash
# View edge function logs
supabase functions logs send-newsletter --follow

# Test edge function locally
supabase functions serve send-newsletter

# Invoke edge function
curl -X POST \
  https://[project].supabase.co/functions/v1/send-newsletter \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "uuid-here"}'

# Run email tests
npx playwright test tests/e2e/email-*.spec.ts

# Clean test data
npx supabase functions invoke cleanup-email-test-data
```

### Key Concepts

1. **Always use absolute URLs** in emails
2. **Inline all styles** - no CSS classes
3. **Table-based layouts** for email compatibility
4. **Header/footer injection** from database
5. **Comprehensive logging** for audit trail
6. **Production-parity testing** with real Resend
7. **Rate limiting** on all email endpoints
8. **Input validation** and sanitization always
9. **Two-way communication** via Cloudflare routing
10. **Graceful degradation** if email fails

---

## SUPPORT & RESOURCES

### Official Documentation
- Resend: https://resend.com/docs
- Cloudflare Email Routing: https://developers.cloudflare.com/email-routing/
- Tiptap: https://tiptap.dev/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

### Email Testing Tools
- Litmus: https://litmus.com
- Email on Acid: https://www.emailonacid.com
- Mail Tester: https://www.mail-tester.com

### Email Design Resources
- Really Good Emails: https://reallygoodemails.com
- Mailchimp Templates: https://mailchimp.com/resources/email-templates/
- Stripo: https://stripo.email

### Compliance
- CAN-SPAM Act: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- GDPR Email Rules: https://gdpr.eu/email-encryption/

---

**End of EMAIL_SYSTEM_MASTER.md**

This document is maintained and updated as the email system evolves. For questions or clarifications, refer to the individual documentation files or contact the development team.
