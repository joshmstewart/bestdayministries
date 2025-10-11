# CONTACT FORM SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
Complete contact form system with database storage, admin email notifications, admin reply functionality, and comprehensive input validation for security.

---

## DATABASE SCHEMA

### contact_form_settings
Stores global configuration for the contact form.

**Columns:**
- `id` (uuid) - Primary key
- `is_enabled` (boolean, default: true) - Toggle form visibility
- `title` (text, default: "Contact Us") - Form header title
- `description` (text, default: "Have questions? We'd love to hear from you.") - Form description
- `recipient_email` (text) - Where submissions are sent
- `success_message` (text, default: "Thank you for contacting us! We'll get back to you soon.") - Toast message on successful submission
- `created_at`, `updated_at` (timestamps)

**RLS Policies:**
- Public SELECT (when `is_enabled = true`)
- Admins ALL

### contact_form_submissions
Stores all form submissions for admin review.

**Columns:**
- `id` (uuid) - Primary key
- `name` (text) - Sender name
- `email` (text) - Sender email (validated)
- `subject` (text, nullable) - Optional subject line
- `message` (text) - Message content
- `message_type` (text) - Type of message (general, bug_report, feature_request, etc.)
- `image_url` (text, nullable) - Optional attached image
- `status` (text, default: 'new') - Submission status ('new', 'read')
- `replied_at` (timestamp, nullable) - When admin sent reply
- `replied_by` (uuid, nullable) - Admin who sent reply
- `reply_message` (text, nullable) - Admin's reply content
- `admin_notes` (text, nullable) - Internal admin notes (not sent to user)
- `created_at` (timestamp)

**RLS Policies:**
- **INSERT:** Anyone can create submissions (both authenticated and anonymous users)
  - Policy: `TO public WITH CHECK (true)`
  - Critical: Must allow anonymous users for public contact form
- **SELECT:** Admins only (prevents users from viewing other submissions)
- **UPDATE:** Admins only (for status management and replies)
- **DELETE:** Admins only (for submission removal)

---

## FRONTEND COMPONENTS

### ContactForm Component
**Location:** `src/components/ContactForm.tsx`

**Purpose:** Public-facing form displayed at bottom of all pages (via Footer component)

**Key Features:**
- Auto-loads settings on mount via `useEffect`
- **Autofills email** for logged-in users (fetches from auth.users)
- Validates input with Zod schema
- Saves to database (always succeeds)
- Sends email notification (optional, graceful failure)
- Shows custom success message from settings
- Hides entirely if `is_enabled = false`

**Validation Schema:**
```typescript
{
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(2000)
}
```

**Submission Flow:**
1. User fills form (email auto-filled for logged-in users)
2. Client-side validation (Zod)
3. Insert into `contact_form_submissions` table (no SELECT after insert)
4. Call `notify-admin-new-contact` edge function with user email (non-blocking)
5. Edge function queries latest submission by email using service role key
6. Show success toast with custom message
7. Reset form

**Critical Implementation Details:**
- Form does NOT attempt to SELECT submission after INSERT (RLS would block this)
- Edge function uses service role key to query submission by email
- Works for both authenticated and anonymous users

**Error Handling:**
- Database insert failure → shows error toast, does not proceed
- Email send failure → logs to console, form still succeeds
- Missing email config → logs warning, form still succeeds

### ContactFormManager Component
**Location:** `src/components/admin/ContactFormManager.tsx`

**Purpose:** Admin interface for managing form settings and viewing submissions

**Sections:**

#### 1. Settings Card
- Enable/disable form globally
- Edit title, description, success message
- Set recipient email address
- All fields update both existing record or create new one

#### 2. Submissions Table
**Columns:**
- Name (sender)
- Email (with copy-to-clipboard icon)
- Subject (if provided)
- Status badge (new/read)
- Date received
- Actions (View, Mark as Read/New, Delete)

**Actions:**
- **View:** Opens dialog with full submission details
- **Mark as Read:** Changes status to 'read', updates badge
- **Mark as New:** Changes status back to 'new'
- **Delete:** Removes submission (with confirmation)
- **Email link:** Click email address to open in default email client
- **Copy email:** Click mail icon to copy email to clipboard

**Badge Count:**
- Shows count of `status = 'new'` submissions
- Updates in real-time via `useContactFormCount` hook
- Displayed in Admin panel "Contact" tab header

---

## EDGE FUNCTIONS

### notify-admin-new-contact
**Location:** `supabase/functions/notify-admin-new-contact/index.ts`

**Purpose:** Sends email notification to admin when new contact form submission is received

**Trigger:** Automatically called after contact form submission

**Input Parameters:**
- `userEmail` (string) - Email of the submitter
- `submissionId` (string, optional) - Direct submission ID (fallback)

**How It Works:**
1. Receives user email from frontend
2. Uses service role key to query latest submission by email
3. Fetches submission details from database
4. Sends formatted email to admin

**Email Template:**
- Includes submission details (name, email, type, subject, message)
- Shows attached image if present
- Color-coded message type badges (bug report = red, feature request = blue)
- "View in Admin Panel" button linking to Admin → Contact tab
- Reply-to header set to submitter's email

### send-contact-reply
**Location:** `supabase/functions/send-contact-reply/index.ts`

**Purpose:** Sends admin's reply back to the contact form submitter

**Authentication:** Requires JWT (admin must be logged in)

**Security Features:**
1. **Input Validation:**
   - Server-side Zod validation (mirrors client schema)
   - Name regex: Only letters, spaces, hyphens, apostrophes
   - Email lowercase + valid format
   - Character limits enforced

2. **XSS Prevention:**
   - HTML escapes all user input: `<` → `&lt;`, `>` → `&gt;`
   - Line breaks converted to `<br>` tags safely

3. **CORS Headers:**
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
   - Handles OPTIONS preflight requests

**Email Template:**
```html
<h2>New Contact Form Submission</h2>
<p><strong>From:</strong> {sanitizedName} ({email})</p>
<p><strong>Subject:</strong> {subject}</p>
<p><strong>Message:</strong></p>
<p>{sanitizedMessage}</p>
<hr>
<p><em>This message was sent via the Best Day Ministries contact form.</em></p>
```

**Configuration:**
- **From:** "Best Day Ministries <marla@joyhousestore.com>"
- **To:** Uses `recipient_email` from settings (or env var fallback)
- **Reply-To:** Sender's email address (admins can reply directly in their email client)

**How Reply-To Works:**
When an admin receives the email notification in their inbox (Gmail, Outlook, etc.), they can simply click "Reply" and it will automatically address the response to the person who submitted the form. No manual copying of email addresses needed.

**Alternative Reply Methods (Admin Panel):**
If email notifications aren't working:
1. **Click email in table** - Opens `mailto:` link in default email client
2. **Copy button** - Copies email address to clipboard
3. **View dialog** - Shows full details including email address

**Required Secrets:**
- `RESEND_API_KEY` - Resend API key for sending emails
- `CONTACT_RECIPIENT_EMAIL` (optional) - Fallback recipient if not in DB

**Error Handling:**
- Returns 400 for validation errors with detailed feedback
- Returns 500 for email send failures
- Logs all errors for debugging

---

## ADMIN ACCESS

### Location in Admin Panel
**Path:** Admin → Contact tab

**Visibility:**
- Tab shows badge with count of new submissions
- Badge count updates in real-time via `useContactFormCount` hook

### Permissions
- **View Settings/Submissions:** Admin or Owner role
- **Edit Settings:** Admin or Owner role
- **Manage Submissions:** Admin or Owner role

---

## INTEGRATION POINTS

### Footer Component
**Location:** `src/components/Footer.tsx`

Includes `<ContactForm />` at the bottom of every page. Form automatically hides if `is_enabled = false` in settings.

### UnifiedHeader Component
**Location:** `src/components/UnifiedHeader.tsx`

Shows badge count on Admin button when there are new contact form submissions:
```typescript
{(moderationCount + pendingVendorsCount + messageModerationCount + contactFormCount) > 0 && (
  <Badge>{moderationCount + pendingVendorsCount + messageModerationCount + contactFormCount}</Badge>
)}
```

---

## HOOKS

### useContactFormCount
**Location:** `src/hooks/useContactFormCount.ts`

**Purpose:** Real-time count of new contact form submissions

**Returns:** `{ count: number, loading: boolean }`

**Query:**
```typescript
.from("contact_form_submissions")
.select("*", { count: "exact", head: true })
.eq("status", "new")
```

**Realtime:** Subscribes to INSERT/UPDATE/DELETE events on `contact_form_submissions` table

---

## SETUP INSTRUCTIONS

### 1. Configure Resend (Email Sending)

**Required Steps:**
1. Sign up at [resend.com](https://resend.com)
2. **CRITICAL:** Verify your email domain at [resend.com/domains](https://resend.com/domains)
   - Add DNS records (SPF, DKIM) for your domain
   - Wait for verification (usually 5-10 minutes)
   - **Emails will NOT send without domain verification**
3. Create API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Add API key as `RESEND_API_KEY` secret in Lovable Cloud
5. Update edge function `from` address to use verified domain (line 82)

**Common Issues:**
- **"Domain is not verified" error** → Most common issue! Verify domain in Resend dashboard
- Emails going to spam → Check SPF/DKIM records are configured correctly
- API key invalid → Regenerate key and update secret
- Domain not verified → Wait for DNS propagation (can take up to 24 hours)

### 2. Configure Contact Form Settings

**Via Admin Panel:**
1. Navigate to Admin → Contact tab
2. Toggle "Enable Contact Form" ON
3. Set form title and description
4. Enter recipient email address (where submissions will be sent)
5. Customize success message
6. Click "Save Settings"

**Via Database (Manual):**
```sql
INSERT INTO contact_form_settings (
  is_enabled,
  title,
  description,
  recipient_email,
  success_message
) VALUES (
  true,
  'Contact Us',
  'Have questions? We''d love to hear from you.',
  'your@email.com',
  'Thank you for contacting us! We''ll get back to you soon.'
);
```

### 3. Test the Form

1. Navigate to any page (form appears at bottom)
2. Fill out the form completely
3. Submit
4. Check:
   - Toast appears with success message
   - Submission appears in Admin → Contact
   - Email received at recipient address

---

## VALIDATION RULES

### Client-Side (Zod)
- **Name:** 2-100 characters
- **Email:** Valid email format, max 255 characters
- **Subject:** Optional, max 200 characters
- **Message:** 10-2000 characters

### Server-Side (Edge Function)
- **Name:** 1-100 characters, letters/spaces/hyphens/apostrophes only
- **Email:** Valid email format, lowercase, max 255 characters
- **Subject:** Optional, max 200 characters
- **Message:** 1-5000 characters (more lenient than client)

### Security Measures
- HTML escaping on all user input
- Email validation on both client and server
- Rate limiting via Supabase (database-level)
- CORS headers properly configured
- No raw SQL queries (uses Supabase client methods)

---

## TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| Form doesn't appear | `is_enabled = false` | Enable in Admin → Contact settings |
| **Emails not sending** | **Domain not verified in Resend** | **Verify domain at resend.com/domains** |
| Form submits but no email | Resend not configured | Add `RESEND_API_KEY` secret |
| Email goes to spam | Domain not verified | Add SPF/DKIM records in DNS |
| Can't reply to messages | Email notifications not working | Verify domain, then use reply-to in email |
| Validation errors | Input doesn't meet rules | Check error messages, adjust input |
| Can't access Admin panel | Not admin/owner role | Check `user_roles` table |
| Badge count not updating | Realtime subscription issue | Check console for errors |
| Settings won't save | RLS policy issue | Verify user has admin role |
| Form loads but crashes | `useEffect` bug (was `useState`) | Fixed in current version |
| **"Failed to send message" error** | **RLS policy blocking INSERT** | **Ensure RLS policy allows anonymous submissions with `TO public`** |
| Submissions work in dev but fail in prod | RLS policy too restrictive | Check that INSERT policy uses `TO public WITH CHECK (true)` |

---

## FUTURE ENHANCEMENTS

**Not Yet Implemented:**
- [ ] Email templates (currently plain HTML)
- [ ] Attachment uploads (files/images)
- [ ] Auto-responder emails to sender
- [ ] Custom form fields (beyond name/email/subject/message)
- [ ] Spam protection (reCAPTCHA integration)
- [ ] Form analytics (submission rates, response times)
- [ ] Webhook notifications (Slack, Discord)
- [ ] Multi-language support
- [ ] Custom CSS styling per page
- [ ] A/B testing for form copy

---

## HOW TO RESPOND TO CONTACT FORM MESSAGES

**Method 1: Email Reply (Recommended)**
When email notifications are working:
1. Admin receives email notification at `recipient_email`
2. Email has `reply-to` header set to sender's email
3. Admin clicks "Reply" in their email client (Gmail, Outlook, etc.)
4. Response goes directly to the person who submitted the form

**Method 2: Manual Email (Fallback)**
If email notifications aren't working:
1. Admin views submission in Admin → Contact
2. Click the email address to open in default email client
3. OR click copy icon to copy email address to clipboard
4. Compose response manually

**Method 3: Admin Reply Interface (NEW)**
Built-in reply functionality in the admin panel:
1. Admin views submission in Admin → Contact
2. Click "Reply" button in submission row or view dialog
3. Compose reply message in dialog
4. Add optional admin notes (internal only)
5. Click "Send Reply" to email response to submitter
6. Reply is tracked in database with timestamp and admin ID
7. Original message shown in context for reference
8. Submission automatically marked as "read"

**Current Status:**
- ✅ Admin email notifications working (via `notify-admin-new-contact`)
- ✅ Reply functionality working (via `send-contact-reply`)
- ✅ Reply tracking in database

## CRITICAL BUG FIXES

### Bug #1: Settings Loader (October 2025)
**Issue:** Settings loader was using `useState` instead of `useEffect`
**Impact:** Settings never loaded, form always hidden
**Fixed:** Changed to `useEffect(() => { ... }, [])` on mount
**File:** `src/components/ContactForm.tsx` line 44

**Before (BROKEN):**
```typescript
useState(() => {
  const loadSettings = async () => { ... };
  loadSettings();
});
```

**After (FIXED):**
```typescript
useEffect(() => {
  const loadSettings = async () => { ... };
  loadSettings();
}, []);
```

### Bug #2: RLS Policy Blocking Submissions (October 2025)
**Issue:** RLS policy on `contact_form_submissions` was too restrictive for anonymous users
**Impact:** Form worked in dev (authenticated users) but failed in production for some users
**Root Cause:** 
- Original policy didn't explicitly allow public INSERT
- Form tried to SELECT submission after INSERT, which RLS blocked even for authenticated users
**Fixed:** 
1. Updated RLS policy to explicitly allow public submissions: `TO public WITH CHECK (true)`
2. Removed SELECT after INSERT in ContactForm component
3. Modified edge function to query by email instead of submission ID

**Migration:**
```sql
DROP POLICY IF EXISTS "Anyone can create submissions" ON public.contact_form_submissions;

CREATE POLICY "Anyone can create submissions including anonymous"
ON public.contact_form_submissions
FOR INSERT
TO public
WITH CHECK (true);
```

---

## Testing

### E2E Tests (`tests/e2e/forms.spec.ts`)

**Coverage:**
- ✅ Contact form display and validation
- ✅ Required field validation
- ✅ Email format validation
- ✅ **Anonymous user submission** (tests RLS policy fix)
- ✅ **Authenticated user submission** (tests email auto-fill)
- ✅ Form reset after successful submission
- ✅ Success toast/message display

**Critical Tests:**
1. **Anonymous Submission Test** - Verifies the RLS policy allows public submissions
2. **Authenticated Submission Test** - Ensures logged-in users can submit with pre-filled email

**Running Tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run only forms tests
npx playwright test forms.spec.ts

# Run in UI mode (interactive)
npx playwright test forms.spec.ts --ui
```

---

**Last Updated:** After implementing admin reply functionality, email notifications, and RLS policy fix
**Key Files:**
- `src/components/ContactForm.tsx` - Public form
- `src/components/admin/ContactFormManager.tsx` - Admin interface with reply dialog
- `supabase/functions/notify-admin-new-contact/index.ts` - Admin email notifications
- `supabase/functions/send-contact-reply/index.ts` - Reply email sender
- `src/hooks/useContactFormCount.ts` - Badge count hook

## NEW FEATURES (2025)

### Admin Email Notifications
- Automatic email sent to admin when new contact form submission received
- Beautiful HTML template with logo, color-coded message types
- Includes all submission details and attached images
- Direct link to view in admin panel
- Reply-to header for easy email responses

### Reply Functionality
- Built-in reply interface in admin panel
- Reply button shows "Replied" state after sending
- Reply dialog shows original message for context
- Optional admin notes field (internal only, not sent to user)
- Reply content and timestamp tracked in database
- Professional email template for replies
- Automatic status update to "read" on reply

### Enhanced UI
- Color-coded message type badges (bug reports, feature requests, etc.)
- Image upload support with preview
- Reply status indicators throughout admin interface
- Message type dropdown for better categorization
