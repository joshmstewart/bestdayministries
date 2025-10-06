# SPONSORSHIP SYSTEM - MASTER DOCUMENTATION

## OVERVIEW
Complete sponsorship system with Stripe payments, guardian controls, sponsor messaging, and admin management.

---

## DATABASE SCHEMA

### Core Tables

**sponsor_besties**
- `id`, `bestie_id` (nullable - links to actual user), `bestie_name`, `image_url`, `voice_note_url`
- `text_sections` (jsonb: `[{header, text}]`), `aspect_ratio` (default: '9:16')
- `monthly_goal`, `is_active`, `is_fully_funded`, timestamps
- **RLS:** Public SELECT (active only), Admins ALL

**sponsorships**
- `id`, `sponsor_id` (auth.users), `bestie_id` (auth.users), `sponsor_bestie_id` (sponsor_besties.id)
- `amount`, `frequency` ('one-time'/'monthly'), `status` ('active'/'cancelled'/'paused')
- `stripe_subscription_id`, `started_at`, `ended_at`
- **RLS:** Sponsors view their own, Besties view theirs, Admins ALL

**sponsor_messages**
- `id`, `bestie_id`, `sent_by`, `subject`, `message`, `audio_url`, `image_url`
- `status` ('pending_approval'/'approved'/'sent'/'rejected')
- `from_guardian` (bool), `is_read` (bool), `rejection_reason`
- `approved_by`, `approved_at`, `sent_at`, timestamps
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

### Views

**sponsor_bestie_funding_progress**
- Aggregates: `sponsor_bestie_id`, `bestie_name`, `current_monthly_pledges`, `monthly_goal`, `funding_percentage`, `remaining_needed`
- **Calculation:** SUM of active monthly sponsorships grouped by sponsor_bestie_id

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
- View/send messages to bestie
- Funding progress updates automatically when subscription changes

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

### Admin Components
- `SponsorBestieManager.tsx` - CRUD for listings
- `SponsorPageOrderManager.tsx` - Section ordering
- `SponsorBestiePageManager.tsx` - Header content editor

---

## PAGES

- `/sponsor-bestie` - Public sponsorship page
- `/sponsorship-success` - Post-payment confirmation
- `/guardian-links` - My Besties (sponsors + guardians)
- `/bestie-messages` - Bestie message center
- `/guardian-approvals` - Guardian approval hub

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
| Guest sponsorship not linking | Email mismatch or trigger failure | Check `link_guest_sponsorships` trigger logs |
| Can't view sponsorships after signup | Email mismatch | Verify signup email matches sponsorship email |

---

## FUTURE ENHANCEMENTS

- [ ] Guardian-initiated messages to sponsors
- [ ] Sponsor message replies (two-way messaging)
- [x] ~~Sponsorship management (upgrade/downgrade/cancel)~~ ✅ DONE via Stripe portal
- [ ] Analytics dashboard for sponsorships
- [ ] Bulk message to all sponsors
- [ ] Scheduled messages
- [ ] Message templates
- [ ] Sponsor tiers with benefits
- [ ] Impact reporting to sponsors
- [ ] Tax receipts for donations

---

**Last Updated:** After implementing guardian image editing with cropping and fixing message display/notification issues
