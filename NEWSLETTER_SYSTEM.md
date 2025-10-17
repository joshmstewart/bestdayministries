# NEWSLETTER SYSTEM DOCUMENTATION

## OVERVIEW
Complete email newsletter system with campaign management, subscriber lists, automatic header/footer injection, rich content editing, and Stripe integration for sending emails via Resend.

---

## DATABASE TABLES

### newsletter_campaigns
**Purpose:** Store newsletter campaign details and content
**Columns:**
- id (uuid, PK)
- subject (text) - Email subject line
- preview_text (text, nullable) - Email preview/preheader text
- html_content (text) - Main email body HTML
- status (text) - 'draft' | 'scheduled' | 'sent' | 'sending'
- scheduled_send_time (timestamp, nullable) - When to send if scheduled
- sent_at (timestamp, nullable) - Actual send timestamp
- created_by (uuid) - Admin who created
- created_at (timestamp)
- updated_at (timestamp)
- recipient_count (integer, default: 0) - Total recipients
- opened_count (integer, default: 0) - Tracking metric
- clicked_count (integer, default: 0) - Tracking metric

**RLS:**
- SELECT: Admins only
- INSERT: Admins only
- UPDATE: Admins only
- DELETE: Admins only

### newsletter_subscribers
**Purpose:** Manage email subscription list
**Columns:**
- id (uuid, PK)
- email (text, unique) - Subscriber email
- user_id (uuid, nullable) - Link to auth user if exists
- first_name (text, nullable)
- last_name (text, nullable)
- status (text) - 'active' | 'unsubscribed' | 'bounced' | 'complained'
- subscribed_at (timestamp)
- unsubscribed_at (timestamp, nullable)
- source (text, nullable) - How they subscribed
- metadata (jsonb, default: {})

**RLS:**
- SELECT: Admins only
- INSERT: Anyone (for public signup forms)
- UPDATE: Admins only (for status changes)
- DELETE: Admins only

### app_settings (Newsletter-specific keys)
**newsletter_header:**
```json
{
  "enabled": boolean,
  "html": string
}
```

**newsletter_footer:**
```json
{
  "enabled": boolean,
  "html": string
}
```

---

## COMPONENTS

### Admin Interface

#### NewsletterSettings.tsx
**Location:** `src/components/admin/newsletter/NewsletterSettings.tsx`
**Purpose:** Main admin interface for newsletter management
**Features:**
- Campaign list view
- Create/edit campaigns
- Send/schedule campaigns
- View statistics
- Access header/footer settings

#### NewsletterHeaderFooterSettings.tsx
**Location:** `src/components/admin/newsletter/NewsletterHeaderFooterSettings.tsx`
**Purpose:** Configure automatic header and footer content
**Features:**
- Toggle enable/disable for header and footer
- Rich text editor for content
- Logo insertion buttons (Desktop and Mobile logos)
- Live preview of header and footer
- Separate tabs for header and footer
- Save to app_settings table

**Logo Integration:**
- Fetches logo_url and mobile_app_icon_url from app_settings
- Parses JSON format and converts storage paths to public URLs
- Inserts logos with proper inline styling (width, centering)
- Logos appear in editor for formatting

#### RichTextEditor.tsx
**Location:** `src/components/admin/newsletter/RichTextEditor.tsx`
**Purpose:** Rich text editing with advanced features
**Extensions:**
- StarterKit (basic formatting)
- ResizableImage (with width/height/style attributes)
- Youtube (embed videos)
- Link (hyperlinks)
- TextStyle, FontFamily, Color
- Underline, Highlight
- TextAlign
- Placeholder

**Features:**
- Image upload with crop dialog
- Image resize controls (XS, S, M, L, XL, Full)
- Image alignment (left, center, right)
- Image re-crop functionality
- YouTube embed
- Video upload (with warning about email client support)
- Link insertion
- Full formatting toolbar
- Inline styles preserved for email compatibility

**Image Insertion API:**
```typescript
interface RichTextEditorRef {
  insertImage: (url: string, width?: string) => void;
}
```

#### NewsletterPreviewDialog.tsx
**Location:** `src/components/admin/newsletter/NewsletterPreviewDialog.tsx`
**Purpose:** Preview email before sending
**Features:**
- Shows subject and preview text
- Combines header + content + footer
- Applies email-specific CSS
- Automatic unsubscribe footer
- Scrollable dialog

**Email Assembly:**
```typescript
const finalHtml = `
  ${headerEnabled ? headerHtml : ""}
  ${htmlContent}
  ${footerEnabled ? footerHtml : ""}
  <div style="...">
    <!-- Unsubscribe footer (always included) -->
  </div>
`;
```

---

## EDGE FUNCTIONS

### send-newsletter
**Location:** `supabase/functions/send-newsletter/index.ts`
**Purpose:** Send newsletter campaigns via Resend
**Triggers:** Called by admin when sending campaign

**Workflow:**
1. Authenticate request (admin only)
2. Fetch campaign details
3. Fetch active subscribers (status='active')
4. Load header/footer settings from app_settings
5. Construct final HTML:
   - Add header if enabled
   - Add campaign html_content
   - Add footer if enabled
   - Add unsubscribe link footer
6. Send emails via Resend API
7. Update campaign status to 'sent'
8. Update recipient_count

**Request:**
```typescript
{
  campaignId: string
}
```

**Response:**
```typescript
{
  success: boolean,
  sent: number,
  errors: Array<{email: string, error: string}>
}
```

**Email Structure:**
```html
<!-- Optional Header -->
<header>{{newsletter_header.html}}</header>

<!-- Campaign Content -->
{{campaign.html_content}}

<!-- Optional Footer -->
<footer>{{newsletter_footer.html}}</footer>

<!-- Required Unsubscribe Footer -->
<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
  <p>You're receiving this because you subscribed to our newsletter.</p>
  <p><a href="#">Unsubscribe</a></p>
  <p>Best Day Ministries<br/>Your Address Here</p>
</div>
```

**Environment Variables:**
- RESEND_API_KEY (required)

**Error Handling:**
- Validates campaign exists
- Validates campaign status (must be 'draft' or 'scheduled')
- Catches individual send failures
- Returns partial success with error details

---

## WORKFLOWS

### Creating a Campaign
1. Admin → Settings → Newsletter
2. Click "Create Campaign"
3. Fill in subject, preview text
4. Use RichTextEditor to compose content:
   - Add text, images, videos, links
   - Format with toolbar
   - Insert logos if needed
5. Click "Preview" to see final email
6. Save as draft or send immediately

### Configuring Header/Footer
1. Admin → Settings → Newsletter → Header/Footer tab
2. Toggle "Enable Automatic Header"
3. Use RichTextEditor to design header:
   - Add branding, welcome text
   - Insert desktop or mobile logo
   - Format with colors, fonts, alignment
4. Preview shows how it looks
5. Repeat for footer
6. Save settings
7. All future campaigns automatically include header/footer

### Logo Insertion
1. Logos must be uploaded via Admin → Settings → App Settings
2. In header/footer editor, click "Insert Desktop Logo" or "Insert Mobile Logo"
3. Logo inserted with inline styles:
   - Header logos: 200px width
   - Footer logos: 150px width
   - Centered with `margin: 0 auto`
4. Select logo in editor to resize or realign
5. Logo URLs are public Supabase Storage URLs

### Sending a Campaign
1. Open campaign in edit mode
2. Verify content in preview
3. Click "Send Now" or "Schedule"
4. Edge function processes:
   - Loads header/footer settings
   - Fetches active subscribers
   - Constructs final HTML
   - Sends via Resend
   - Updates campaign status
5. View statistics: sent, opened, clicked

### Managing Subscribers
1. Admin → Settings → Newsletter → Subscribers tab
2. View list of all subscribers
3. Filter by status (active, unsubscribed, bounced)
4. Manually add subscribers
5. Export subscriber list
6. Remove/unsubscribe manually

---

## CRITICAL PATTERNS

### Email Compatibility
- All styles MUST be inline (not in `<style>` tags)
- Use table layouts for complex designs
- Avoid modern CSS (flexbox, grid)
- Test in multiple email clients
- Keep images optimized (<200KB each)

### Image Handling
- Images stored in `app-assets` bucket (public)
- Original images preserved for re-cropping
- Inline styles for width, height, alignment
- Alt text always included
- Lazy loading NOT used (emails load immediately)

### Header/Footer Injection
- Stored in app_settings as JSONB
- Loaded server-side in edge function
- Prepended/appended to campaign content
- Preview shows exact final output
- Unsubscribe footer always added (compliance)

### Logo Management
- logos stored as JSON in app_settings:
  ```json
  { "url": "path/to/logo.png" }
  ```
- Must parse JSON and convert to public URL
- Uses Supabase Storage public URLs
- Inline styles ensure proper rendering

### Security
- Only admins can create/send campaigns
- Subscriber emails never exposed to frontend
- Edge function validates admin role
- RLS policies protect all newsletter tables
- Unsubscribe link required (CAN-SPAM compliance)

---

## STRIPE MODE HANDLING
Newsletter sending respects Stripe mode settings but operates independently. Emails are sent in both test and live modes.

---

## FUTURE ENHANCEMENTS
- Unsubscribe link functionality (currently placeholder)
- Email open tracking (pixel tracking)
- Click tracking (link redirects)
- Subscriber segmentation
- A/B testing
- Template library
- Automated campaigns
- RSS-to-email
- Subscriber preferences
- Double opt-in
- GDPR compliance tools
- Bounce handling
- Spam complaint handling

---

## TROUBLESHOOTING

### Logos Not Appearing
**Issue:** Broken image icon in editor or preview
**Cause:** Logo URL not properly parsed from app_settings
**Fix:** Ensure logos are:
1. Uploaded via Admin → Settings → App Settings
2. Stored in public app-assets bucket
3. Parsed from JSON format in code:
   ```typescript
   const parsed = typeof data === 'string' ? JSON.parse(data) : data;
   const url = parsed.url || parsed;
   // Convert storage path to public URL
   const { data: { publicUrl } } = supabase.storage
     .from('app-assets')
     .getPublicUrl(url);
   ```

### Images Not Rendering in Emails
**Issue:** Images broken in received emails
**Cause:** Relative URLs or inline base64
**Fix:** Always use absolute public URLs from Supabase Storage

### Header/Footer Not Appearing
**Issue:** Email sent without header/footer
**Cause:** Not enabled or edge function not loading settings
**Fix:** 
1. Verify enabled in admin UI
2. Check app_settings table has newsletter_header/footer keys
3. Verify edge function loads settings before sending

### Send Button Not Working
**Issue:** Campaign not sending
**Cause:** Missing RESEND_API_KEY or invalid campaign status
**Fix:**
1. Verify RESEND_API_KEY secret is set
2. Check campaign status is 'draft' or 'scheduled'
3. Check browser console for errors
4. Check edge function logs

---

## ADMIN ACCESS
Admin → Settings → Newsletter
- Campaigns tab: Manage campaigns
- Subscribers tab: Manage subscriber list
- Header/Footer tab: Configure automatic content
- Settings tab: General newsletter settings

---

## API REFERENCE

### supabase.from('newsletter_campaigns')
```typescript
// Fetch all campaigns
const { data } = await supabase
  .from('newsletter_campaigns')
  .select('*')
  .order('created_at', { ascending: false });

// Create campaign
const { data } = await supabase
  .from('newsletter_campaigns')
  .insert({
    subject: 'Welcome!',
    preview_text: 'Thank you for subscribing',
    html_content: '<p>Hello!</p>',
    status: 'draft',
    created_by: userId
  });

// Update campaign
const { data } = await supabase
  .from('newsletter_campaigns')
  .update({ status: 'sent', sent_at: new Date() })
  .eq('id', campaignId);
```

### supabase.from('newsletter_subscribers')
```typescript
// Get active subscribers
const { data } = await supabase
  .from('newsletter_subscribers')
  .select('email')
  .eq('status', 'active');

// Subscribe user
const { data } = await supabase
  .from('newsletter_subscribers')
  .insert({
    email: 'user@example.com',
    status: 'active',
    source: 'website_form'
  });

// Unsubscribe
const { data } = await supabase
  .from('newsletter_subscribers')
  .update({
    status: 'unsubscribed',
    unsubscribed_at: new Date()
  })
  .eq('email', 'user@example.com');
```

### supabase.functions.invoke('send-newsletter')
```typescript
const { data, error } = await supabase.functions.invoke('send-newsletter', {
  body: { campaignId: 'uuid-here' }
});

// Response
{
  success: true,
  sent: 150,
  errors: []
}
```

---

## DEPENDENCIES
- @tiptap/react (rich text editor)
- @tiptap/starter-kit
- @tiptap/extension-image
- @tiptap/extension-youtube
- @tiptap/extension-link
- react-easy-crop (image cropping)
- Resend API (email sending)
- Supabase Storage (image hosting)

---

## TESTING CHECKLIST
- [ ] Create campaign with rich content
- [ ] Preview shows header + content + footer
- [ ] Logo insertion works
- [ ] Image resize/align works
- [ ] Send test campaign
- [ ] Verify email received
- [ ] Verify header/footer appear
- [ ] Verify images render
- [ ] Verify links work
- [ ] Test unsubscribe link
- [ ] Check campaign statistics update
- [ ] Test with/without header enabled
- [ ] Test with/without footer enabled
