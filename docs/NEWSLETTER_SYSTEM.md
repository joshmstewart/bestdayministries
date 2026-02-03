# NEWSLETTER & EMAIL MARKETING SYSTEM

## Overview
Comprehensive email marketing platform with manual campaigns, automated trigger-based templates, subscriber management, analytics tracking, and detailed email logging. All emails automatically include header/footer branding and proper unsubscribe links.

## Core Features
- **Manual Campaigns**: Create, schedule, and send one-off newsletter campaigns with rich content
- **Automated Templates**: Trigger-based emails (welcome, anniversary, notifications) with delay options
- **Rich Text Editor**: TipTap with formatting, images, links, YouTube embeds, alignment, colors
- **Test Sending**: Send test emails with [TEST] prefix to verify appearance before sending
- **Subscriber Management**: Add, import, manage subscriber list with status tracking
- **Email Tracking**: Webhook-based tracking for opens, clicks, bounces, complaints via Resend
- **Link Tracking**: Automatic link wrapping with click tracking and redirect
- **Comprehensive Logging**: Every email logged to newsletter_emails_log with full HTML, status, errors
- **Header/Footer Templates**: Global branded header/footer automatically injected into all emails
- **Organization Settings**: Configurable from name, from email, organization name and address
- **Unsubscribe Management**: Automatic unsubscribe links in all emails with one-click processing
- **Analytics Dashboard**: View campaign performance, engagement rates, link clicks
- **Mobile Responsive**: Admin UI with wrapped tabs for mobile screens
- **Batch Sending**: Sends in batches of 100 with delays to prevent rate limiting

## Database Schema

### Tables

#### `newsletter_campaigns`
Manual newsletter campaigns:
- `id` - UUID primary key
- `title` - Campaign name (internal)
- `subject` - Email subject line
- `html_content` - Rich text email body
- `status` - Enum: draft, scheduled, sending, sent, failed
- `scheduled_for` - When to send (nullable)
- `sent_at` - When actually sent (nullable)
- `sent_to_count` - Number of recipients
- `created_by` - FK to profiles (admin who created)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- SELECT: Admins only
- INSERT/UPDATE/DELETE: Admins only

#### `newsletter_subscribers`
Subscriber list:
- `id` - UUID primary key
- `email` - Subscriber email (unique)
- `status` - Enum: active, unsubscribed, bounced
- `subscribed_at` - When they subscribed
- `unsubscribed_at` - When they unsubscribed (nullable)
- `metadata` - JSONB for custom fields

**RLS Policies:**
- SELECT: Admins can view all
- INSERT: Anyone can subscribe (public form)
- UPDATE: Admins only
- DELETE: Admins only

#### `newsletter_analytics`
Email engagement tracking:
- `id` - UUID primary key
- `campaign_id` - FK to newsletter_campaigns
- `recipient_email` - Email address
- `opened_at` - First open timestamp (nullable)
- `clicked_at` - First click timestamp (nullable)
- `open_count` - Total opens
- `click_count` - Total clicks
- `links_clicked` - JSONB array of clicked links

**RLS Policies:**
- SELECT: Admins only
- INSERT: System (via edge functions)

**Note:** Only newsletter campaign emails are tracked here. Non-campaign emails (contact form notifications, system emails) are skipped by the webhook to prevent insertion errors.

#### `newsletter_templates`
Reusable content templates:
- `id` - UUID primary key
- `name` - Template name
- `description` - Template description
- `html_content` - Template body
- `is_active` - Boolean
- `created_by` - FK to profiles
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- SELECT: Admins only
- ALL: Admins only

#### `campaign_templates`
Automated/triggered email templates:
- `id` - UUID primary key
- `name` - Template name
- `description` - Template description
- `subject` - Email subject
- `content` - HTML content
- `trigger_type` - Enum: welcome, anniversary, notification, etc.
- `is_active` - Boolean
- `created_by` - FK to profiles
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- SELECT: Admins only
- ALL: Admins only

#### `newsletter_links`
Link tracking for click analytics:
- `id` - UUID primary key
- `campaign_id` - FK to newsletter_campaigns
- `original_url` - Full URL
- `short_code` - Unique short code for tracking
- `click_count` - Number of clicks
- `created_at` - Creation timestamp

**RLS Policies:**
- SELECT: Anyone (for redirect)
- INSERT/UPDATE: Admins only

#### `newsletter_emails_log`
**NEW:** Comprehensive email audit log tracking every sent email:
- `id` - UUID primary key
- `campaign_id` - FK to newsletter_campaigns (nullable)
- `template_id` - FK to campaign_templates (nullable)
- `recipient_email` - Email sent to
- `recipient_user_id` - FK to profiles if known (nullable)
- `subject` - Email subject line
- `html_content` - Full HTML content sent
- `status` - Enum: sent, failed, bounced
- `error_message` - Error details if failed (nullable)
- `resend_email_id` - Resend API email ID (nullable)
- `metadata` - JSONB with additional info (e.g., is_test: true)
- `sent_at` - Timestamp email was sent
- `created_at` - Log entry creation timestamp

**RLS Policies:**
- SELECT: Admins can view all logs
- INSERT: System only (via edge functions)

**Use Cases:**
- Verify email was actually sent
- Debug delivery issues
- Audit trail for compliance
- View exact content sent to recipient
- Track test emails vs production
- Troubleshoot failed sends

#### `newsletter_drip_steps`
Drip campaign sequence steps:
- `id` - UUID primary key
- `sequence_id` - FK to drip sequence
- `step_number` - Order in sequence
- `campaign_id` - FK to campaign_templates (nullable)
- `delay_value` - How long to wait before sending
- `delay_unit` - Enum: days, hours
- `conditions` - JSONB for conditional logic
- `created_at` - Creation timestamp

**RLS Policies:**
- ALL: Admins only

### App Settings
- `newsletter_header` - JSONB: `{ enabled: boolean, html: string }`
- `newsletter_footer` - JSONB: `{ enabled: boolean, html: string }`
- `newsletter_organization` - JSONB: `{ name: string, address: string, from_email: string, from_name: string }`

## Edge Functions

**CRITICAL IMPLEMENTATION NOTES:**
1. **All send functions MUST inject header/footer** from app_settings
2. **All send functions MUST log to newsletter_emails_log** for audit trail
3. **All send functions MUST use organization settings** for from name/email
4. **Test functions MUST prefix subject** with [TEST]
5. **All functions MUST handle errors gracefully** and log failures
6. **Email formatting MUST be email-client-safe**: standard tables in campaign/template bodies get inline styling (width/padding/word-break). Magazine two-column tables are preserved via `data-two-column`.

### `send-newsletter`
Sends campaign to all active subscribers.

**Auth:** Admin or Owner only

**Request Body:**
```json
{
  "campaignId": "uuid-of-campaign"
}
```

**Logic:**
1. Validates admin access
2. Fetches campaign details
3. Fetches active subscribers
4. Loads header/footer/org settings
5. Constructs final HTML (header + content + footer + unsubscribe)
6. Loops through subscribers:
   - Replaces tracking pixels
   - Replaces link tracking codes
   - Sends via Resend
   - **Logs each send to `newsletter_emails_log`** (NEW)
   - Tracks analytics
7. Updates campaign status
8. Returns success with send count

**Logging:** Every email attempt logged with status (sent/failed), full HTML, error message if failed

**Response Success:**
```json
{
  "success": true,
  "sentCount": 1250
}
```

### `send-test-newsletter`
**NEW:** Sends test email to logged-in admin before launching campaign.

**Auth:** Admin or Owner only

**Request Body:**
```json
{
  "campaignId": "uuid-of-campaign",
  "testEmail": "admin@example.com"
}
```

**Logic:**
1. Validates admin access
2. Fetches campaign details
3. Loads header/footer/org settings
4. Constructs final HTML
5. Replaces placeholders in subject/content: `{{organization_name}}`, `{{month}}`, `{{year}}`, `{{site_url}}`
6. Prepends test warning banner (**tracking disabled**, links still clickable)
7. Sends via Resend
8. **Logs send to `newsletter_emails_log` with `metadata: { is_test: true }`** (NEW)

**Response Success:**
```json
{
  "success": true,
  "message": "Test email sent to admin@example.com"
}
```

**UI:** 
- "Send Test" button on each campaign card
- Automatically uses logged-in user's email
- Test banner clearly marked with ⚠️ icon

### `send-test-automated-template`
**NEW:** Sends test email for automated template to logged-in admin.

**Auth:** Admin or Owner only

**Request Body:**
```json
{
  "templateId": "uuid-of-template",
  "testEmail": "admin@example.com"
}
```

**Logic:**
1. Validates admin access
2. Fetches template details
3. Loads header/footer/org settings
4. Constructs final HTML
5. Prepends test warning banner
6. Sends via Resend
7. **Logs send to `newsletter_emails_log` with `metadata: { is_test: true, template_name: string }`** (NEW)

**Response Success:**
```json
{
  "success": true,
  "message": "Test email sent to admin@example.com"
}
```

**UI:**
- "Send Test" button on each automated template
- Automatically uses logged-in user's email
- Test banner: "This would normally be sent automatically when trigger event occurs"

### `send-automated-campaign`
Trigger-based automated emails (welcome, anniversary, notifications).

**Auth:** Service role (called by other edge functions or triggers)

**Request Body:**
```json
{
  "trigger_event": "user_signup",
  "recipient_email": "user@example.com",
  "recipient_user_id": "uuid-of-user",
  "trigger_data": {
    "user_name": "John Doe",
    "signup_date": "2024-01-15"
  }
}
```

**Logic:**
1. Finds active template for trigger_event with auto_send enabled
2. Exits gracefully if no template found (returns success: false)
3. Loads header/footer/org settings from app_settings
4. Replaces placeholders in subject and content (e.g., [USER_NAME] → "John Doe")
5. Constructs final HTML (header + content + footer)
6. Sends via Resend with from name/email from organization settings
7. **Logs to BOTH tables:**
   - `automated_campaign_sends`: Track send status, trigger data, engagement
   - `newsletter_emails_log`: Full HTML content, subject, metadata with trigger info
8. Returns success with template name used

**Dual Logging Purpose:**
- `automated_campaign_sends`: Real-time status tracking (sent → delivered → opened)
- `newsletter_emails_log`: Complete audit trail with full HTML for debugging

**Response Success:**
```json
{
  "success": true,
  "template_used": "Welcome Email"
}
```

**When No Template:**
```json
{
  "success": false,
  "message": "No template found for this event"
}
```

**Placeholder System:**
Any key in trigger_data can be used in subject/content:
- `trigger_data: { "USER_NAME": "John" }`
- Use in template: `[USER_NAME]` → replaced with "John"

## Frontend Components

### `NewsletterManager`
Main admin interface for all newsletter functionality.

**Location:** `src/components/admin/NewsletterManager.tsx`

**Route:** Admin Dashboard → Newsletter tab

**Structure:**
```tsx
<Tabs defaultValue="campaigns">
  <TabsList className="inline-flex flex-wrap h-auto">
    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
    <TabsTrigger value="automated">Automated</TabsTrigger>
    <TabsTrigger value="templates">Templates</TabsTrigger>
    <TabsTrigger value="log">Email Log</TabsTrigger>
    <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent>...</TabsContent>
</Tabs>
```

**Mobile Responsive:** Tabs wrap to multiple lines on small screens (flex-wrap)

### `NewsletterCampaigns`
Create and manage manual campaigns.

**Location:** `src/components/admin/newsletter/NewsletterCampaigns.tsx`

**Features:**
- Campaign list with status badges (draft/scheduled/sent)
- "Create Campaign" button
- Edit campaign button
- **"Send Test" button** (NEW) - sends to logged-in user
- "Send Now" button (with confirmation)
- "Schedule" button
- "Preview" button
- "View Stats" button
- Delete campaign

**Mobile Responsive:** Campaign cards stack vertically, action buttons wrap

### `CampaignActions`
Action buttons for individual campaigns.

**Location:** `src/components/admin/newsletter/CampaignActions.tsx`

**Buttons:**
- **Send Test** (NEW) - Automatically uses logged-in user's email, no dialog needed
- Send Now - Confirmation dialog before sending
- Schedule - Date/time picker dialog

**Mobile Responsive:** Buttons wrap to multiple rows if needed

### `CampaignTemplates`
Manage automated email templates.

**Location:** `src/components/admin/newsletter/CampaignTemplates.tsx`

**Features:**
- Template list with trigger type badges
- Create/edit templates
- **"Send Test" button** (NEW) - Test automated template
- Toggle active/inactive
- Delete template

**Test Button:** Each template card has "Send Test" button that automatically sends to logged-in admin

### `NewsletterEmailsLog`
**NEW:** View comprehensive log of all sent emails.

**Location:** `src/components/admin/newsletter/NewsletterEmailsLog.tsx`

**Features:**
- **Search:** Filter by recipient email address
- **Status Filter:** Dropdown to filter by sent/failed/bounced
- **Paginated Table:** Shows recent emails first
- **Columns:**
  - Recipient Email
  - Subject
  - Campaign/Template name
  - Status badge (colored by status)
  - Sent At (formatted timestamp)
  - Actions (view details)
- **Details Dialog:**
  - Full email subject
  - Recipient info
  - Campaign/template name
  - Status badge
  - Sent timestamp
  - Resend email ID
  - Full HTML content (scrollable)
  - Error message (if failed)
  - Metadata (JSON viewer)

**Use Cases:**
- "Did this person receive my email?" - Search by email
- "Why did this campaign fail?" - View error messages
- "What exactly was sent?" - View full HTML content
- "Track test emails" - Filter by metadata `is_test: true`
- "Audit compliance" - Full history of all emails

### `NewsletterSubscribers`
Manage subscriber list.

**Location:** `src/components/admin/newsletter/NewsletterSubscribers.tsx`

**Features:**
- Subscriber list with status
- Add subscriber manually
- Import CSV
- Export list
- Unsubscribe/resubscribe
- Delete subscriber

### `NewsletterAnalytics`
Campaign performance metrics.

**Location:** `src/components/admin/newsletter/NewsletterAnalytics.tsx`

**Metrics:**
- Total sent
- Open rate
- Click rate
- Unsubscribe rate
- Top performing campaigns
- Link click breakdown

### `NewsletterSettings`
Configure global newsletter settings.

**Location:** `src/components/admin/newsletter/NewsletterSettings.tsx`

**Sections:**
1. **Organization Info:**
   - Organization name
   - Address
   - From email
   - From name

2. **Header Template:**
   - Enable/disable toggle
   - Rich text editor
   - Preview

3. **Footer Template:**
   - Enable/disable toggle
   - Rich text editor
   - Preview

### `RichTextEditor`
TipTap-based rich text editor for email content.

**CTA Buttons:**
- Insert via the editor’s “Button/CTA” dialog (creates an email-safe `table[data-cta-button]`).
- Remove by hovering the CTA button block in the editor and clicking the small **X** in the top-right corner.

**Magazine (Two-Column) CTA Buttons:**
- Two-column “magazine” layouts (`table[data-two-column]`) use inline `[CTA:text|url|color]` markers inside the layout’s text.
- CTA tables *inside* a magazine layout must NOT be parsed as standalone CTA blocks (otherwise they get lifted out of the layout, often to the bottom of the document).
- Sizing note: CTA buttons (including magazine-owned CTAs with `data-owned-by-two-column="true"`) use the shared sizing constants in `src/components/admin/newsletter/ctaButtonStyles.ts` so the editor, preview, and delivered emails match.

**Styled Boxes (CRITICAL):**
- Styled boxes are identified by `div[data-styled-box]` / `div[data-style]` emitted by the editor.
- We intentionally **do not** auto-detect styled boxes from arbitrary `background-color` values, because that can silently convert normal layout elements (headers, pill badges) into styled-box blocks and rewrite/break a template.
- When saving templates, we read the *latest* HTML directly from the editor ref to avoid race conditions (e.g., width toggles not persisting if the user clicks Save immediately).
- Default box spacing is controlled in `StyledBoxExtension` (inline email-safe styles). If boxes look too tall for short phrases, adjust the base padding/margins there.

**Features:**
- Bold, italic, underline, strikethrough
- Headings (H1-H6)
- Bullet/numbered lists
- Text alignment (left, center, right, justify)
- Links
- Images (with crop dialog)
- Text color
- Background color
- Code blocks
- Blockquotes
- Horizontal rules

**Image Handling:**
- Click "Image" button
- Upload image file
- Opens ImageCropDialog
- Select aspect ratio
- Crop/zoom image
- Inserts into content

## Workflows

### Creating and Sending a Campaign

1. **Create Campaign:**
   - Admin → Newsletter → Campaigns tab
   - Click "Create Campaign"
   - Enter title (internal)
   - Enter subject line
   - Use rich text editor for content
   - Save as draft

2. **Test Campaign:**
   - Click "Send Test" button on campaign card
   - Email automatically sent to logged-in admin
   - Email includes test warning banner
   - Admin receives email
   - Reviews content and formatting

3. **Send or Schedule:**
   - If test looks good, click "Send Now" or "Schedule"
   - Confirm action
   - Campaign status updates
   - Edge function processes send
   - Each email logged to `newsletter_emails_log`

4. **Monitor Results:**
   - View "Email Log" tab to see all sent emails
   - Search for specific recipient if issue reported
   - Check "Analytics" tab for open/click rates
   - View individual email stats

### Creating Automated Template

1. **Create Template:**
   - Admin → Newsletter → Automated tab
   - Click "Create Template"
   - Enter name/description
   - Enter subject line
   - Use rich text editor for content
   - Select trigger type
   - Set active

2. **Test Template:**
   - Click "Send Test" button on template card
   - Email sent to logged-in admin
   - Email includes test notice: "This would normally be sent automatically when trigger event occurs"
   - Admin reviews content

3. **Activate:**
   - Toggle template to active
   - Template now triggers on events
   - Each automated send logged to `newsletter_emails_log`

### Troubleshooting Failed Email

1. **User Reports:** "I didn't receive the newsletter"
2. **Admin Checks:**
   - Navigate to Newsletter → Email Log tab
   - Enter user's email in search box
   - View all emails sent to that address
3. **Investigate:**
   - Check status: sent vs failed
   - If failed: Read error message
   - View full HTML content to verify
   - Check Resend email ID for external tracking
4. **Action:**
   - If failed: Fix issue and resend
   - If sent: Check with user's spam folder
   - View metadata for additional context

## Testing Strategy

### Manual Campaign Testing
1. Create campaign in draft
2. Click "Send Test" (uses logged-in email)
3. Verify test banner appears
4. Check formatting, images, links
5. If good → Send Now
6. If issues → Edit and test again

### Automated Template Testing
1. Create template
2. Click "Send Test"
3. Verify test notice: "This would normally be sent automatically..."
4. Verify variable placeholders (if any)
5. Check formatting
6. Activate template

### Email Log Verification
1. After sending any campaign
2. Go to Email Log tab
3. Search for test email
4. Verify status = "sent"
5. View details to confirm content

## Security & RLS

### Campaign Security
- Only admins can create/edit campaigns
- Only admins can send newsletters
- Subscribers can only view their subscription status

### Email Log Security
- Only admins can view logs
- Logs inserted by system (edge functions)
- No user-facing access to logs

### Subscriber Privacy
- Emails encrypted in transit
- Unsubscribe links honored immediately
- Bounced emails auto-marked

## Performance Optimizations

### Batch Sending
`send-newsletter` uses chunked sending:
- 50 emails per batch
- 100ms delay between batches
- Prevents rate limiting
- Logs errors individually

### Email Log Pagination
- Logs query limited to 100 records per page
- Indexed on `sent_at` for fast sorting
- Search indexed on `recipient_email`

### Mobile Performance
- Tab bar wraps instead of scrolls
- Reduces horizontal overflow issues
- Better UX on small screens

## Common Issues & Solutions

### "Test email not received"
**Cause:** Email in spam or Resend API key issue  
**Fix:** 
1. Check spam/junk folder
2. Verify RESEND_API_KEY is set in Supabase secrets
3. Check Resend dashboard for domain verification (SPF/DKIM)
4. Check Email Log tab to see if email was marked as sent or failed

### "Send button disabled"
**Cause:** Campaign status not "draft"  
**Fix:** Only draft campaigns can be sent. Already-sent campaigns show "sent" status.

### "Images not showing in email"
**Cause:** Image URLs not absolute or header/footer not injected  
**Fix:** 
1. Verify header/footer are enabled in Settings
2. Check that images use full URLs (https://)
3. Test with "Send Test" before sending to all
4. View Email Log to see actual HTML sent

### "Footer/Header not in email"
**Cause:** Edge function not loading app_settings correctly  
**Fix:** 
1. Verify newsletter_header and newsletter_footer exist in app_settings
2. Check enabled flag is true in settings
3. All send functions (send-newsletter, send-test-newsletter, send-automated-campaign, send-test-automated-template) fetch and inject header/footer
4. View Email Log to verify HTML includes header/footer

### "Links not tracking clicks"
**Cause:** Link tracking not configured in send-newsletter  
**Fix:** 
1. send-newsletter automatically wraps links with tracking codes
2. Resend webhook must be configured to receive click events
3. Check Resend dashboard → Webhooks for webhook setup
4. Webhook URL: `{SUPABASE_URL}/functions/v1/resend-webhook`

### "Opened event not showing"
**Cause:** Email clients blocking tracking pixels (Apple Mail Privacy Protection, Gmail caching)  
**Fix:** 
1. Open tracking is inherently unreliable due to privacy features
2. Use click tracking instead for reliable engagement metrics
3. Test with regular Gmail (not Apple Mail) for more reliable open tracking
4. Webhook receives events from Resend but may not capture all opens

### "Automated emails not sending"
**Cause:** Template not active or auto_send disabled  
**Fix:** 
1. Verify campaign_templates table has is_active = true
2. Verify auto_send = true for template
3. Check trigger_event matches exactly
4. Review automated_campaign_sends table for error messages
5. Check Email Log for any failed sends

## Future Enhancements

### Planned Features
- **A/B Testing**: Test different subject lines and content
- **Dynamic Content**: Personalized blocks based on user data
- **Drip Sequences**: Multi-step email sequences (newsletter_drip_steps table exists)
- **Advanced Segmentation**: Filter subscribers by custom criteria
- **Email Templates Library**: Pre-designed responsive templates
- **Scheduled Campaigns**: Set future send dates for campaigns
- **SMS Integration**: Multi-channel communication
- **Webhook Reliability**: Retry failed webhook processing
- **Unsubscribe Preferences**: Granular subscription management

### Technical Improvements
- Implement batch webhook processing for high-volume sends
- Add retry logic for failed sends
- Optimize link tracking performance
- Enhanced mobile preview in editor
- Dark mode support for admin UI

### "Email log shows 'failed' status"
**Cause:** Resend API error (bad email, over quota, etc.)
**Fix:** View error message in log details, fix issue, resend

### "Tabs overflow on mobile"
**Cause:** Old grid layout
**Fix:** Already fixed - tabs now wrap with inline-flex + flex-wrap

### "Can't find sent email in log"
**Cause:** Search is case-sensitive
**Fix:** Use lowercase search or partial email

## Future Enhancements

### Planned Features
- A/B testing for subject lines
- Dynamic content blocks (personalization)
- Email templates gallery
- Drag-and-drop email builder
- Advanced segmentation (send to specific roles)
- Scheduled drip campaigns
- SMS integration
- Webhook triggers for external events

## Documentation Status
**Last Updated:** 2025-10-20
**Status:** Complete - All newsletter functionality documented including new email logging system
**Coverage:** Database schema, edge functions, components, workflows, testing, admin tools

## Related Documentation
- `MASTER_SYSTEM_DOCS.md` - High-level newsletter system overview
- `EDGE_FUNCTIONS_REFERENCE.md` - Edge function catalog
- `IMAGE_CROP_DIALOG.md` - Image cropping used in rich text editor
