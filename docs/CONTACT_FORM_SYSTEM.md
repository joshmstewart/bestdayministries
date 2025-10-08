# CONTACT FORM SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
Complete contact form system with database storage, email notifications via Resend, admin management interface, and comprehensive input validation for security.

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
- `status` (text, default: 'new') - Submission status ('new', 'read')
- `created_at` (timestamp)

**RLS Policies:**
- Anyone can INSERT (public submissions)
- Admins can SELECT/UPDATE (for management)
- No DELETE allowed (audit trail)

---

## FRONTEND COMPONENTS

### ContactForm Component
**Location:** `src/components/ContactForm.tsx`

**Purpose:** Public-facing form displayed at bottom of all pages (via Footer component)

**Key Features:**
- Auto-loads settings on mount via `useEffect`
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
1. User fills form
2. Client-side validation (Zod)
3. Insert into `contact_form_submissions` table
4. Call `send-contact-email` edge function (non-blocking)
5. Show success toast with custom message
6. Reset form

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

**Badge Count:**
- Shows count of `status = 'new'` submissions
- Updates in real-time via `useContactFormCount` hook
- Displayed in Admin panel "Contact" tab header

---

## EDGE FUNCTION

### send-contact-email
**Location:** `supabase/functions/send-contact-email/index.ts`

**Purpose:** Sends email notification to recipient address using Resend API

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
- **Reply-To:** Sender's email address (for easy responses)

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
2. Verify your email domain at [resend.com/domains](https://resend.com/domains)
   - Add DNS records (SPF, DKIM) for your domain
   - Wait for verification (usually 5-10 minutes)
3. Create API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Add API key as `RESEND_API_KEY` secret in Lovable Cloud

**Common Issues:**
- Emails going to spam → Check SPF/DKIM records are configured
- API key invalid → Regenerate key and update secret
- Domain not verified → Wait for DNS propagation

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
| Form submits but no email | Resend not configured | Add `RESEND_API_KEY` secret |
| Email goes to spam | Domain not verified | Add SPF/DKIM records in DNS |
| Validation errors | Input doesn't meet rules | Check error messages, adjust input |
| Can't access Admin panel | Not admin/owner role | Check `user_roles` table |
| Badge count not updating | Realtime subscription issue | Check console for errors |
| Settings won't save | RLS policy issue | Verify user has admin role |
| Form loads but crashes | `useEffect` bug (was `useState`) | Fixed in current version |

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

## CRITICAL BUG FIX

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

---

**Last Updated:** After fixing critical `useState` bug and creating complete documentation
**Key Files:**
- `src/components/ContactForm.tsx` - Public form
- `src/components/admin/ContactFormManager.tsx` - Admin interface
- `supabase/functions/send-contact-email/index.ts` - Email sender
- `src/hooks/useContactFormCount.ts` - Badge count hook
