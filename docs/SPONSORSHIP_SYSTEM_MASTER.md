# SPONSORSHIP SYSTEM - MASTER DOCUMENTATION

## OVERVIEW
Complete sponsorship system with Stripe payments, guardian controls, sponsor messaging, admin management, automated receipts, and year-end tax summaries.

---

## DATABASE SCHEMA

### Core Tables

**sponsor_besties**
- `id`, `bestie_id` (nullable - links to actual user), `bestie_name`, `image_url`, `voice_note_url`, `video_url`
- `text_sections` (jsonb: `[{header, text}]`), `aspect_ratio` (default: '9:16')
- `monthly_goal`, `is_active`, `is_fully_funded`, timestamps
- `available_for_sponsorship` (bool), `start_date`, `end_date`
- **RLS:** Public SELECT (active only), Admins ALL

**sponsorships**
- `id`, `sponsor_id` (auth.users), `bestie_id` (auth.users), `sponsor_bestie_id` (sponsor_besties.id)
- `amount`, `frequency` ('one-time'/'monthly'), `status` ('active'/'cancelled'/'paused')
- `stripe_subscription_id`, `stripe_customer_id`, `stripe_mode` ('test'/'live')
- `sponsor_email` (nullable - for guest checkouts before account creation)
- `receipt_sent` (bool), `receipt_sent_at`, `receipt_number`
- `started_at`, `ended_at`, timestamps
- **RLS:** Sponsors view their own, Besties view theirs, Admins ALL

**sponsor_messages**
- `id`, `bestie_id`, `sent_by`, `subject`, `message`, `audio_url`, `image_url`, `video_url`
- `status` ('pending_approval'/'approved'/'sent'/'rejected')
- `from_guardian` (bool), `is_read` (bool), `rejection_reason`
- `approved_by`, `approved_at`, `sent_at`, timestamps
- `moderation_status`, `moderation_reason` (for image/video moderation)
- **RLS:** Guardians approve for linked besties, Sponsors see approved/sent, Besties view their own

**caregiver_bestie_links**
- `id`, `caregiver_id`, `bestie_id`, `relationship`
- `allow_sponsor_messages`, `require_message_approval` (both default: true)
- `show_sponsor_link_on_guardian`, `show_sponsor_link_on_bestie` (both default: true)
- **RLS:** Caregivers CRUD their own, Besties view links to them

**sponsor_page_sections**
- `id`, `section_key` (unique: 'header'/'featured_video'/'sponsor_carousel'/'selection_form'/'impact_info')
- `section_name`, `is_visible`, `display_order`, `content` (jsonb)
- **RLS:** Public SELECT, Admins ALL

**receipt_settings**
- `id`, `organization_name`, `organization_address`, `tax_id` (EIN)
- `from_email`, `reply_to_email`, `website_url`
- `receipt_footer_text`, timestamps
- **RLS:** Public SELECT, Admins ALL

**year_end_summary_settings**
- `id`, `email_subject`, `email_intro_text`, `tax_notice_text`
- `is_enabled`, timestamps
- **RLS:** Admins ALL

**year_end_summary_sent**
- `id`, `user_id`, `user_email`, `user_name`, `tax_year`
- `total_amount`, `sent_at`, `resend_email_id`, `status`
- **RLS:** Users view their own, Admins ALL

### Views

**sponsor_bestie_funding_progress**
- Aggregates: `sponsor_bestie_id`, `bestie_name`, `current_monthly_pledges`, `monthly_goal`, `funding_percentage`, `remaining_needed`
- **Calculation:** SUM of active monthly sponsorships grouped by sponsor_bestie_id

**sponsorship_year_end_summary**
- Per-sponsor annual aggregation: `sponsor_email`, `sponsor_name`, `tax_year`
- `total_amount`, `total_donations`, `donations` (jsonb array of transactions)
- **Data:** All completed sponsorships grouped by email + year

---

## USER WORKFLOWS

### 1. SPONSOR A BESTIE (Supporter)

**Entry Points:**
- Nav "Sponsor" button → `/sponsor-bestie`
- Carousel "Sponsor This Bestie" → `/sponsor-bestie?bestieId=xxx`

**Flow:**
1. Load active `sponsor_besties` + funding progress
2. Display carousel/list (randomized or pre-selected by URL param)
3. User selects bestie, amount (min $10), frequency (one-time/monthly)
4. **Email:** Auto-filled if logged in, but always editable | Guest checkout supported
5. Call `create-sponsorship-checkout` edge function
6. Redirect to Stripe Checkout
7. On success → `/sponsorship-success` → calls `verify-sponsorship-payment`
8. Creates `sponsorships` record:
   - **If logged in:** `sponsor_id` = user ID, `sponsor_email` = NULL
   - **If guest:** `sponsor_id` = NULL, `sponsor_email` = entered email
   - **Auto-linking:** When guest creates account with same email, trigger links existing sponsorships
9. Status: 'active', stores `stripe_subscription_id` (for monthly)

**Validation:**
- Min $10, valid email (Zod)
- Besties can sponsor (shows info toast but doesn't block)
- Defaults: $25, monthly

**Optional Features:**
- **Cover Stripe Fees:** Checkbox adds 3% to amount to cover processing costs
  - Example: $25 donation + $0.75 fee = $25.75 charged
  - Full $25 goes to bestie, platform covers fees

**Guest Checkout:**
- No account required to sponsor
- Sponsorships stored with `sponsor_email` instead of `sponsor_id`
- Message shown: "Don't have an account? You can sponsor as a guest and create one later to view your sponsorships."
- When user creates account with matching email, sponsorships auto-link via database trigger

### 2. VIEW SPONSORSHIPS (Supporter/Guardian)

**Location:** `/guardian-links` → My Besties section

**Display:**
- Cards with bestie image, voice note, text sections
- Funding progress bar (if monthly_goal > 0)
- TTS on first text section
- "You're Sponsoring!" badge on active sponsorships

**Actions:**
- **Manage Subscription:** "Manage Subscription" button → calls `manage-sponsorship` → opens Stripe billing portal
  - Cancel subscription (takes effect at period end)
  - Update payment method
  - View payment history
  - Download invoices
- **Update Amount:** "Update Amount" button → calls `update-sponsorship` with new amount
  - Only for monthly subscriptions
  - Amount range: $10-$500
  - Updates both Stripe and database
- View/send messages to bestie
- Funding progress updates automatically when subscription changes

### 2B. SHARE SPONSORSHIP VIEW (Supporter)

**Location:** `/guardian-links` → Bestie card → "Share View" button

**Flow:**
1. Supporter clicks "Share View" on their sponsored bestie
2. Enters 3-emoji friend code of another bestie to share with
3. Creates record in `sponsorship_shares` table
4. Shared bestie can now view (read-only) the sponsorship details

**RLS:** Uses `can_view_sponsorship()` function to grant access

### 3. SEND MESSAGE TO SPONSORS (Bestie)

**Location:** `/bestie-messages`

**Flow:**
1. Check `caregiver_bestie_links.allow_sponsor_messages`
2. If false → show disabled message
3. Compose: Subject + (Text OR Audio)
4. Audio: Record or upload file
5. Optional: Add subject for audio messages
6. Submit → status: `pending_approval` (if `require_message_approval`) OR `approved`
7. Realtime updates when status changes

**Guardian Editing:**
**Location:** `/guardian-approvals` → Messages tab

1. Guardian sees pending messages
2. Options:
   - **Approve As-Is:** Direct approval
   - **Edit & Approve:** Opens dialog with:
     - Edit subject, message text
     - Add/replace image (with crop dialog)
     - Image preview with recrop option
3. On approve: `status` → 'approved', `from_guardian` → true, saves `image_url` if added
4. Reject: Enter reason, bestie sees rejection

**Status Flow:**
- `pending_approval` → Bestie sees "Pending Approval"
- `approved` → Bestie sees "Approved - Delivered" (green)
- `sent` → Internal status after sponsor views
- `rejected` → Bestie sees rejection reason

### 4. RECEIVE MESSAGES (Sponsor)

**Location:** `/guardian-links` → Bestie card → Messages section

**Display:**
- Accordion with unread indicator (red dot)
- Shows: Subject, date, "Latest" badge on first
- Content types:
  - Audio: Player in muted background
  - Image: Full display with optional text below
  - Text: Background card
  - Audio + Image: Both shown together
- Auto-marks as read when opened
- Updates `status` from 'approved' → 'sent' on first view

**Realtime:** Badge updates immediately when messages are read

---

## GUARDIAN WORKFLOWS

### 1. LINK TO BESTIE

**Location:** `/guardian-links` → Add Link

**Flow:**
1. Enter bestie's 3-emoji friend code
2. Describe relationship
3. Toggle settings:
   - Post approval required
   - Comment approval required
   - Message approval required
   - Allow featured posts
4. Creates `caregiver_bestie_links` record

### 2. MESSAGE APPROVAL

**Location:** `/guardian-approvals` → Messages tab

**Actions:**
- View pending messages with audio player/text preview
- **Edit & Approve:**
  - Modify subject/message
  - Add/crop image (ImageCropDialog with aspect ratio selection)
  - Preview before sending
- **Approve As-Is:** No changes
- **Reject:** Provide reason

**Realtime:** Count updates immediately in header badge

### 3. MANAGE SPONSORSHIPS

**Location:** `/guardian-links` → Sponsorships section

**View:**
- All sponsorships for linked besties
- Funding progress
- Sponsor list (future feature)

### 4. APPROVE SPONSOR MESSAGE MEDIA

**Location:** `/guardian-approvals` → Messages tab

**Media Moderation:**
- **Images:** Guardian can approve/reject images attached to sponsor messages
- **Videos:** Guardian can approve/reject videos attached to sponsor messages
- Moderation status: 'pending' → 'approved' or 'flagged'
- Rejection reason stored for bestie visibility
- Admin can configure moderation policies (auto-approve low severity vs. require manual review)

---

## SPONSOR WORKFLOWS

### 1. VIEW DONATION HISTORY

**Location:** `/guardian-links` → Donation History tab (or dedicated page)

**Display:**
- **Component:** `DonationHistory.tsx`
- Table view of all donations with:
  - Date, bestie name, amount, receipt number
  - Frequency indicator (one-time vs. monthly)
  - Status badges (completed, active, cancelled)
- Download receipt button per donation
- Filter by year
- Export functionality (future)

### 2. YEAR-END TAX SUMMARY

**Automatic Generation:**
- System aggregates all donations per sponsor by tax year
- View: `sponsorship_year_end_summary` 
- Includes: Total amount, donation count, itemized list

**Requesting Summary:**
- Admins can send year-end summaries via Admin panel
- Sponsors can request their own summary (future feature)
- Email includes: Organization logo, EIN, itemized donations, tax notice

**Preview:**
- Admins can preview email template with mock data
- Shows exact formatting sponsors will receive

---

## ADMIN WORKFLOWS

### 1. MANAGE SPONSOR BESTIES

**Location:** Admin → Sponsorships → Sponsor Besties

**CRUD:**
- Create/edit bestie listings
- Upload image (app-assets bucket) + voice note
- Add text sections (min 1): `[{header, text}]`
- Set aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3)
- Set monthly goal
- Toggle: `is_active`, `is_fully_funded`
- Link to actual bestie user (`bestie_id`) - optional

### 2. CONFIGURE SPONSOR PAGE

**Location:** Admin → Sponsorships → Sponsor Page Order

**Actions:**
- Drag-and-drop section reordering (dnd-kit)
- Toggle visibility (eye = visible, eye-off = hidden)
- Auto-saves on change

**Sections:**
- `header` - Badge text, heading, description
- `featured_video` - Video dropdown
- `sponsor_carousel` - Bestie carousel
- `selection_form` - Sponsorship form
- `impact_info` - Impact text

**Location:** Admin → Sponsorships → Page Content

**Edit:** Badge text, heading, description, featured video selection

### 3. VIEW SPONSORSHIPS

**Location:** Admin → Sponsorships (future dedicated tab)

**View:**
- All active sponsorships
- Sponsor → Bestie relationships
- Payment history
- Manage subscriptions

### 4. MANAGE TRANSACTIONS

**Location:** Admin → Sponsorships → Transactions

**Component:** `SponsorshipTransactionsManager.tsx`

**Features:**
- View all sponsorship transactions (one-time + recurring)
- Filter by: Status, date range, sponsor, bestie
- Display: Sponsor name/email, bestie, amount, frequency, status, dates
- Export transaction data
- Link to Stripe dashboard for detailed payment info
- Shows test vs. live mode indicator

### 5. CONFIGURE RECEIPTS

**Location:** Admin → Sponsorships → Receipt Settings

**Component:** `ReceiptSettingsManager.tsx`

**Settings:**
- Organization name, address, EIN (tax ID)
- From email address (must be verified in Resend)
- Reply-to email
- Website URL
- Receipt footer text
- Logo URL (pulled from app settings)

**Validation:**
- EIN format validation
- Email domain verification check
- Required fields enforcement

### 6. CONFIGURE YEAR-END SUMMARIES

**Location:** Admin → Sponsorships → Year-End Settings

**Component:** `YearEndSummarySettings.tsx`

**Settings:**
- Enable/disable year-end emails
- Email subject template (supports {year} placeholder)
- Email intro text
- Tax notice text (legal disclaimer)
- Preview email with mock data

**Actions:**
- Preview button generates sample email
- Test email send (to admin)
- Bulk send to all sponsors (confirmation required)

### 7. VIEW SENT YEAR-END SUMMARIES

**Location:** Admin → Sponsorships → Year-End History

**Component:** `YearEndSummarySentHistory.tsx`

**Display:**
- Table of all sent year-end summaries
- Columns: Recipient, email, tax year, amount, date sent, status
- Resend email ID for tracking
- Filter by year
- Resend functionality (if email failed)

### 8. STRIPE MODE MANAGEMENT

**Location:** Admin → Sponsorships → Stripe Settings

**Component:** `StripeModeSwitcher.tsx`

**Features:**
- Toggle between test mode and live mode
- Visual indicator of current mode (yellow badge = test, green = live)
- Warning when switching modes
- Dual webhook support (both modes active simultaneously)
- Mode stored in `stripe_mode` column on sponsorships table

---

## STRIPE INTEGRATION

### Edge Functions

**Location:** `supabase/functions/`

**create-sponsorship-checkout**
- **Request:** `{bestie_id, amount, frequency, email}`
- **Flow:**
  1. **No auth check required** - supports guest checkout
  2. Get/create Stripe customer by email
  3. Create Stripe price for amount
  4. Create checkout session (mode: 'subscription' for monthly, 'payment' for one-time)
  5. Store `bestie_id` in session metadata
  6. Return `{url}` for redirect

**verify-sponsorship-payment**
- **Request:** `{session_id}`
- **Flow:**
  1. Verify payment with Stripe
  2. Get customer email from session
  3. Find user by email from auth.users (if exists)
  4. Check for existing sponsorship by `stripe_subscription_id`
  5. Insert into `sponsorships`:
     - **If user found:** `sponsor_id` = user.id, `sponsor_email` = NULL
     - **If guest:** `sponsor_id` = NULL, `sponsor_email` = customer email
     - `sponsor_bestie_id`, `amount`, `frequency`, `status: 'active'`
     - `stripe_subscription_id` (if monthly), `stripe_mode`
  6. Return success message:
     - **If authenticated:** Standard confirmation
     - **If guest:** "Your sponsorship will automatically link when you create an account with this email."

**manage-sponsorship**
- **Request:** None (uses auth token)
- **Flow:**
  1. Get user's Stripe customer by email
  2. Create Stripe billing portal session
  3. Return `{url}` → redirect to Stripe portal
  4. User can cancel/modify subscriptions
  5. Webhooks handle status updates automatically

**update-sponsorship**
- **Request:** `{sponsorship_id, new_amount}`
- **Flow:**
  1. Authenticate user
  2. Verify user owns sponsorship (active monthly only)
  3. Validate new amount ($10-$500 range)
  4. Find Stripe subscription by customer email + bestie_id
  5. Update Stripe subscription price
  6. Update `sponsorships.amount` in database
  7. Return success confirmation
- **Validation:** Amount must be between $10-$500, sponsorship must be active and monthly

**send-sponsorship-receipt**
- **Request:** `{sponsorship_id}`
- **Flow:**
  1. Fetch sponsorship details + receipt settings
  2. Retrieve organization logo from app settings
  3. Generate receipt HTML with:
     - Receipt number (auto-generated: RCPT-YYYYMMDD-XXXXX)
     - Sponsor name, organization details
     - Donation amount, date, bestie name
     - Tax ID (EIN), legal disclaimer
  4. Send via Resend API
  5. Update sponsorship: `receipt_sent = true`, `receipt_sent_at`, `receipt_number`
  6. Return success/error

**generate-missing-receipts**
- **Request:** None (admin only)
- **Flow:**
  1. Query all sponsorships where `receipt_sent = false`
  2. Loop through each, call `send-sponsorship-receipt`
  3. Log success/failure for each
  4. Return summary: Total processed, successes, failures
- **Use Case:** Backfill receipts after system was implemented

**generate-year-end-summary**
- **Request:** `{taxYear?, sendEmail?}`
- **Flow:**
  1. Authenticate user
  2. Query `sponsorship_year_end_summary` view for user's email + tax year
  3. If no data and `sendEmail = false`: Generate mock preview data
  4. Fetch year-end settings + receipt settings + logo
  5. Build HTML email with:
     - Header with logo and year
     - Total donation amount (large, styled box)
     - Itemized donation table (date, bestie, amount, receipt #)
     - Tax information box (EIN, legal notice)
     - Organization footer
  6. If `sendEmail = true`:
     - Send via Resend API
     - Log to `year_end_summary_sent` table
  7. Return HTML + metadata (`isMockData` flag for preview)

### Webhooks (ACTIVE)

**stripe-webhook** - Handles all Stripe events automatically

**Supported Events:**

1. **customer.subscription.deleted**
   - Status: 'active' → 'cancelled'
   - Sets `ended_at` to current timestamp
   - Updates sponsorship record by `sponsor_id` + `sponsor_bestie_id`

2. **customer.subscription.updated**
   - Handles three states:
     - **Scheduled cancellation:** `cancel_at_period_end = true` → Status stays 'active', sets `ended_at` to `cancel_at` date
     - **Fully active:** `status = active` → Status 'active', clears `ended_at`
     - **Cancelled:** Any other status → Status 'cancelled', sets `ended_at` to now
   - Checks subscription metadata for `bestie_id` to target specific sponsorship

3. **checkout.session.completed**
   - Creates/updates sponsorship record on successful payment
   - Extracts amount from session (converts cents to dollars)
   - Sets frequency based on subscription interval (month/year)
   - Status: 'active', `started_at`: now
   - Stores `stripe_mode` (test/live)

**Implementation Details:**
- Dual-mode support (test + live webhooks)
- Finds user by customer email from auth.users
- Uses subscription metadata for precise targeting
- Logs all events for debugging
- **Guest checkout support:** Updates sponsorships by `sponsor_email` if `sponsor_id` is NULL

### Status Flow & Progress Bar Updates

**Sponsorship Statuses:**
- `active` - Subscription active, counts toward funding
- `cancelled` - Subscription ended, excluded from funding
- `paused` - Temporarily inactive (future)

**Funding Progress Recalculation:**
- View: `sponsor_bestie_funding_progress`
- Query: `SUM(amount) WHERE status = 'active' AND frequency = 'monthly'`
- **Automatic updates:** When webhook changes status, view reflects new total immediately
- Progress bar shows: `(current_monthly_pledges / monthly_goal) * 100`
- "Fully Funded" when: `funding_percentage >= 100` OR `is_fully_funded = true`

**Ending Amount (Scheduled Cancellations):**
- When sponsor cancels but subscription hasn't ended yet (still in billing period)
- Progress bar shows two segments:
  - **Stable funding:** Will continue after period ends (green)
  - **Ending funding:** Will end when period expires (yellow/orange)
- Calculation: `endingAmount` = sponsorships with `ended_at` set but still in active period
- Visual indicator helps guardians/admins plan for funding changes

**UI Update Flow:**
1. User cancels via Stripe portal
2. Webhook receives `customer.subscription.updated` or `.deleted`
3. Database updates `sponsorships.status` to 'cancelled'
4. `sponsor_bestie_funding_progress` view recalculates (excludes cancelled)
5. Frontend queries view → sees reduced funding percentage
6. Progress bar updates automatically on next load/realtime update

---

## REALTIME UPDATES

### Guardian Approvals Badge
**Hook:** `useGuardianApprovalsCount`
- Subscribes to: `discussion_posts`, `discussion_comments`, `sponsor_messages`, `caregiver_bestie_links`
- Updates immediately on approval/rejection

### Sponsor Unread Badge
**Hook:** `useSponsorUnreadCount`
- Subscribes to: `sponsor_messages`, `sponsorships`
- Updates when messages are read/sent

### Message Inbox
**Component:** `SponsorMessageInbox`
- Subscribes to: `sponsor_messages` filtered by `bestie_id`
- Updates when new messages arrive or status changes

---

## KEY BUSINESS RULES

### Guest Checkout
- **No account required** to sponsor a bestie
- Sponsorships stored with `sponsor_email` (no `sponsor_id`)
- Database trigger `link_guest_sponsorships()` runs on user signup
- Automatically links sponsorships when email matches
- Guest sees message: "Your sponsorship will automatically link when you create an account with this email."
- RLS policy allows logged-in users to view sponsorships by email match

### Funding Progress
- Only shown if `monthly_goal > 0`
- Calculated from SUM of active monthly sponsorships
- "Fully Funded" when `is_fully_funded` OR `funding_percentage >= 100`

### Message Approval
- Controlled per-link via `require_message_approval`
- Guardian can edit before approving (add images, modify text)
- Status: pending_approval → approved → sent (auto on sponsor view)
- Besties see "Approved - Delivered" after guardian approval

### Sponsor Bestie vs Actual Bestie
- `sponsor_besties.id` → Listing ID (used in sponsorships)
- `sponsor_besties.bestie_id` → Optional link to actual user
- Allows "generic" sponsorships without user accounts

### Image Handling
- Upload to `app-assets` bucket
- Guardian can crop images with aspect ratio selection
- Display supports audio + image together

---

## COMPONENTS

### Display Components
- `SponsorBestieDisplay.tsx` - Carousel with TTS, audio, funding progress
- `FundingProgressBar.tsx` - Visual progress indicator

### Form Components
- `BestieSponsorMessenger.tsx` - Bestie message composition
- `GuardianSponsorMessenger.tsx` - Guardian message composition (future)

### Guardian Components
- `BestieSponsorMessages.tsx` - Guardian approval interface with edit dialog
- `VendorAssetRequests.tsx` - Asset approval (reusable pattern)

### Sponsor Components
- `SponsorMessageInbox.tsx` - Accordion message list with read status
- `DonationHistory.tsx` - Sponsor donation history table with receipt downloads

### Admin Components
- `SponsorBestieManager.tsx` - CRUD for listings
- `SponsorPageOrderManager.tsx` - Section ordering
- `SponsorBestiePageManager.tsx` - Header content editor
- `SponsorshipTransactionsManager.tsx` - Transaction viewing and management
- `ReceiptSettingsManager.tsx` - Organization receipt configuration
- `YearEndSummarySettings.tsx` - Year-end tax summary email configuration
- `YearEndSummarySentHistory.tsx` - History of sent year-end summaries
- `StripeModeSwitcher.tsx` - Toggle between test/live Stripe modes

---

## PAGES

- `/sponsor-bestie` - Public sponsorship page
- `/sponsorship-success` - Post-payment confirmation
- `/guardian-links` - My Besties (sponsors + guardians)
- `/bestie-messages` - Bestie message center
- `/guardian-approvals` - Guardian approval hub

---

## DATABASE INFRASTRUCTURE

### Triggers

**link_guest_sponsorships()**
- **Trigger:** ON INSERT on `auth.users` (after new user signup)
- **Purpose:** Automatically link guest sponsorships to new accounts
- **Logic:**
  1. Get new user's email from `auth.users`
  2. Find all `sponsorships` where `sponsor_email` matches AND `sponsor_id` IS NULL
  3. Update those records: Set `sponsor_id` = new user ID, clear `sponsor_email`
- **Security:** SECURITY DEFINER with `search_path = public`

### Security Functions

**has_admin_access(_user_id)**
- Returns boolean
- Checks if user has 'admin' or 'owner' role in `user_roles` table

**is_guardian_of(_guardian_id, _bestie_id)**
- Returns boolean
- Checks if guardian-bestie link exists in `caregiver_bestie_links`

**get_user_role(_user_id)**
- Returns user_role enum
- Fetches user's role from `user_roles` table

**can_view_sponsorship(_sponsorship_id, _user_id)**
- Returns boolean
- Checks if user is sponsor, bestie, or has shared access via `sponsorship_shares`

### Storage Buckets

**app-assets** (Public)
- Sponsor bestie images: `sponsor-besties/{id}/`
- Sponsor message images: `sponsor-messages/{id}/`
- Sponsor message videos: `sponsor-messages/{id}/`
- Organization logos: `logos/`

**featured-bestie-audio** (Public)
- Sponsor bestie voice notes
- Bestie message audio recordings

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| Badge not updating | Missing realtime cleanup | Check useEffect return |
| Message not showing image | Display logic prioritizes audio | Fixed: show both |
| Aspect ratio buttons don't work | Missing state callback | Add `onAspectRatioKeyChange` |
| Bestie can't send messages | `allow_sponsor_messages` false | Guardian enables in settings |
| Funding not calculating | No monthly goal set | Admin sets `monthly_goal` |
| Stripe checkout fails | Missing secret key | Check `STRIPE_SECRET_KEY_TEST/LIVE` |
| Progress bar not updating after cancel | Webhook not processing | Check edge function logs |
| Cancelled sponsorship still counts | Status not updated | Verify webhook received event |
| Portal button doesn't work | No Stripe customer | User must complete checkout first |
| Receipt not sending | From email not verified | Verify domain in Resend dashboard |
| Receipt sends but not received | Email in spam | Check SPF/DKIM DNS records |
| Receipt number duplicates | System clock issue | Receipts use timestamp + random suffix |
| Year-end summary shows no data | No completed donations for year | System requires at least 1 payment |
| Year-end preview fails | Receipt settings not configured | Admin must configure org details |
| Mock data shows in preview | No real donations exist | Expected behavior for preview mode |
| Email logo not showing | Logo URL not set in app settings | Upload logo in Admin → Settings |
| EIN validation fails | Wrong format | Use XX-XXXXXXX format (e.g., 12-3456789) |
| Transactions show wrong mode | Mode not stored on creation | Check `stripe_mode` column |
| Test mode payments not visible | Viewing live mode only | Toggle Stripe mode switcher |
| Guest sponsorship not linking | Email mismatch or trigger failure | Check `link_guest_sponsorships` trigger logs |
| Can't view sponsorships after signup | Email mismatch | Verify signup email matches sponsorship email |
| Can't update sponsorship amount | Not monthly or not active | Only active monthly sponsorships can be updated |
| Update amount fails | Amount out of range | Must be $10-$500 |
| Shared sponsorship not visible | Friend code mismatch | Verify correct 3-emoji code used |

---

## FUTURE ENHANCEMENTS

- [ ] Guardian-initiated messages to sponsors
- [ ] Sponsor message replies (two-way messaging)
- [x] ~~Sponsorship management (upgrade/downgrade/cancel)~~ ✅ DONE via Stripe portal
- [x] ~~Automated receipt generation~~ ✅ DONE on payment completion
- [x] ~~Year-end tax summaries~~ ✅ DONE with email automation
- [x] ~~Transaction management dashboard~~ ✅ DONE for admins
- [x] ~~Test/Live mode switching~~ ✅ DONE with dual webhook support
- [ ] Analytics dashboard for sponsorships (donation trends, retention rates)
- [ ] Bulk message to all sponsors
- [ ] Scheduled messages
- [ ] Message templates
- [ ] Sponsor tiers with benefits
- [ ] Impact reporting to sponsors (monthly updates)
- [ ] Automated thank-you emails
- [ ] Donor recognition levels (Bronze, Silver, Gold)
- [ ] Monthly giving leaderboard (opt-in)
- [ ] Sponsor portal (self-service donation history + receipts)
- [ ] Multi-bestie sponsorship packages
- [ ] Recurring donation reminders
- [ ] Gift sponsorships (sponsor on behalf of someone else)

---

## RECEIPT SYSTEM DETAILS

### Automatic Receipt Generation
- **Trigger:** Stripe webhook `checkout.session.completed`
- **Timing:** Sent immediately after successful payment
- **Format:** Professional HTML email with logo
- **Content:**
  - Unique receipt number (RCPT-YYYYMMDD-XXXXX format)
  - Sponsor name + organization details
  - Donation amount, date, payment method
  - Bestie name being sponsored
  - Tax deduction notice + EIN
  - Organization contact information

### Receipt Number Format
- Prefix: `RCPT-`
- Date: `YYYYMMDD` (e.g., 20250106)
- Separator: `-`
- Unique ID: 5-digit random number
- Example: `RCPT-20250106-47392`
- **Uniqueness:** Date + random ensures no duplicates

### Email Requirements
- **From Email:** Must be verified in Resend
- **Domain Verification:** SPF + DKIM records required
- **Best Practice:** Use organization domain (e.g., receipts@yourorg.org)
- **Reply-To:** Can differ from From email

### Manual Backfill
- Admin can trigger `generate-missing-receipts` edge function
- Processes all sponsorships where `receipt_sent = false`
- Logs results for each attempt
- Safe to run multiple times (checks `receipt_sent` flag)

---

## YEAR-END TAX SUMMARY DETAILS

### Data Aggregation
- **Source:** `sponsorship_year_end_summary` view
- **Grouping:** By sponsor email + tax year
- **Includes:** All completed payments (one-time + recurring)
- **Excludes:** Cancelled, refunded, or failed payments

### Email Template Features
- **Header:** Organization logo + branded colors
- **Summary Box:** Large, highlighted total donation amount
- **Itemized Table:** Every donation with date, bestie, amount, receipt #
- **Tax Box:** EIN, legal disclaimer, deduction information
- **Footer:** Organization contact info + thank you message

### Preview System
- **Mock Data:** System generates sample donations if no real data exists
- **Use Case:** Test email formatting before sending
- **Safety:** Preview mode (`sendEmail = false`) never sends actual emails
- **Indicator:** Response includes `isMockData: true` flag

### Bulk Send Process
1. Admin configures settings (subject, intro, tax notice)
2. Admin clicks "Preview Email" to verify formatting
3. Admin selects tax year
4. Admin confirms bulk send
5. System queries all sponsors with donations for that year
6. Sends individual emails to each sponsor
7. Logs each send to `year_end_summary_sent` table
8. Admin can view history and resend if needed

### Legal Considerations
- **Tax Disclaimer:** Customizable text for legal compliance
- **EIN Display:** Always shown for tax deduction purposes
- **"No goods/services exchanged" notice:** Included automatically
- **Record Retention:** All sent summaries logged with timestamps

---

## KEY BUSINESS RULES

### Funding Progress
- Only shown if `monthly_goal > 0`
- Calculated from SUM of active monthly sponsorships
- "Fully Funded" when `is_fully_funded` OR `funding_percentage >= 100`

### Message Approval
- Controlled per-link via `require_message_approval`
- Guardian can edit before approving (add images, modify text)
- Status: pending_approval → approved → sent (auto on sponsor view)
- Besties see "Approved - Delivered" after guardian approval
- **Media Moderation:** Images/videos go through moderation pipeline

### Sponsor Bestie vs Actual Bestie
- `sponsor_besties.id` → Listing ID (used in sponsorships)
- `sponsor_besties.bestie_id` → Optional link to actual user
- Allows "generic" sponsorships without user accounts

### Image & Video Handling
- Upload to `app-assets` bucket
- Guardian can crop images with aspect ratio selection
- Video upload supported (with moderation)
- Display supports audio + image + video together

### Receipt Delivery
- Automatic on payment completion
- Only sent once per transaction (`receipt_sent` flag prevents duplicates)
- Failed receipts can be manually resent by admin
- Resend uses same receipt number for consistency

### Year-End Summary Rules
- **Timing:** Typically sent in January for previous tax year
- **Eligibility:** Any sponsor with at least 1 completed donation in the year
- **Multiple Besties:** Summary aggregates all besties sponsored by same email
- **Guest Checkouts:** Included if `sponsor_email` exists on sponsorship record
- **Frequency:** Once per tax year per sponsor (tracked in `year_end_summary_sent`)

### Stripe Mode Separation
- **Test Mode:** For development and testing, uses `STRIPE_SECRET_KEY_TEST`
- **Live Mode:** For real transactions, uses `STRIPE_SECRET_KEY_LIVE`
- **Data Isolation:** Transactions tagged with `stripe_mode` column
- **Webhooks:** Both modes supported simultaneously with separate endpoints
- **Reporting:** Admin can filter views by mode to avoid mixing test/live data

---

**Last Updated:** After implementing year-end tax summaries, automated receipt system, transaction management, Stripe mode switching, and photo/video approval workflows
