# Edge Functions Quick Reference

Complete index of all edge functions with authentication, dependencies, and key capabilities.

## Standard Import Versions

**Use these standardized versions for all edge functions:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
```

---

## By Category

### Authentication & User Management
- **`record-terms-acceptance`** - [Auth Required] Records terms acceptance with IP, user agent, timestamp audit trail
- **`create-user`** - [Admin Only] Creates new user accounts for testing/development

### Payments & Donations
- **`create-donation-checkout`** - [Public] Creates Stripe checkout for one-time and recurring donations
- **`create-sponsorship-checkout`** - [Public] Creates Stripe checkout for bestie sponsorships
- **`sync-donation-history`** - [Auth/Cron] Syncs Stripe transactions to `donation_stripe_transactions` table, filters marketplace purchases
- **`donation-mapping-snapshot`** - [Admin Only] Loads all Stripe + DB objects for an email + date window for manual mapping
- **`stripe-webhook`** - [Webhook] Handles all Stripe events (dual mode: test/live)
- **`manage-sponsorship`** - [Auth Required] Customer portal for managing subscriptions
- **`update-sponsorship`** - [Auth Required] Updates sponsorship tier/amount
- **`generate-receipts`** - [Cron] Batch generates monthly sponsorship receipts
- **`send-sponsorship-receipt`** - [Internal] Sends individual tax-deductible receipts
- **`generate-year-end-summary`** - [Auth/Cron] Creates annual giving summaries for tax purposes
- **`verify-sponsorship-payment`** - [Webhook] Verifies Stripe checkout completion
- **`reconcile-donations-from-stripe`** - [Cron] Auto-fixes pending donations by checking Stripe status

### Email & Notifications
- **`send-notification-email`** - [Internal] Sends individual notification emails via Resend
- **`send-digest-email`** - [Cron] Sends batched digest emails (daily/weekly)
- **`send-approval-notification`** - [Internal] Notifies guardians of pending approvals
- **`send-message-notification`** - [Internal] Notifies about new sponsor messages
- **`send-contact-reply`** - [Auth Required] Sends admin replies to contact form submissions
- **`notify-admin-new-contact`** - [Internal] Notifies admins of new contact form submissions
- **`process-inbound-email`** - [Webhook] Processes CloudFlare email routing, auto-threads replies, filters system emails
- **`send-newsletter`** - [Admin Only] Sends newsletter campaigns to subscribers (email-safe inline table formatting), logs all emails
- **`send-test-newsletter`** - [Admin Only] Sends test newsletter to logged-in admin (same formatting as production send)
- **`send-test-automated-template`** - [Admin Only] Sends test automated template to logged-in admin (same formatting as production send)
- **`send-automated-campaign`** - [Admin Only] Sends automated marketing campaigns via Resend

### Content Moderation
- **`moderate-content`** - [Auth Required] AI text moderation via Lovable AI (Gemini)
- **`moderate-image`** - [Auth Required] AI image moderation via Lovable AI (Gemini Vision)

### Marketplace & Vendor Management
- **`create-marketplace-checkout`** - [Auth Required] Creates checkout for marketplace products
- **`verify-marketplace-payment`** - [Auth Optional on return] Verifies checkout by order_id + session_id, logs failures to `error_logs` and returns `debug_log_id`
- **`create-stripe-connect-account`** - [Auth Required] Creates/retrieves Stripe Connect accounts for vendors
- **`check-stripe-connect-status`** - [Auth Required] Checks vendor's Stripe Connect onboarding status
- **`create-vendor-transfer`** - [Internal] Transfers funds to vendor on order fulfillment
- **`send-order-shipped`** - [Internal] Sends customer shipped/tracking email (used by Printify status updates)
- **`submit-tracking`** - [Vendor Auth] Submits order tracking via AfterShip API
- **`aftership-webhook`** - [Webhook] Receives AfterShip tracking updates (⚠️ NOT FUNCTIONAL)
- **`broadcast-product-update`** - [Admin Only] Sends notifications to all users about product updates

### Testing & Development
- **`create-persistent-test-accounts`** - [Admin Only] Creates/verifies persistent test accounts (PROTECTED from cleanup)
- **`seed-email-test-data`** - [Test Only] Seeds test users and data for email testing
- **`cleanup-email-test-data`** - [Test Only] Removes test data by email prefix
- **`cleanup-test-data-unified`** - [Test Only] Unified cleanup for email and E2E tests (excludes persistent accounts)
- **`seed-halloween-stickers`** - [Admin Only] Seeds Halloween sticker collection for testing
- **`reset-daily-cards`** - [Admin Only] Resets daily scratch cards with scope (self/admins/all)

### Webhooks & Integrations
- **`github-test-webhook`** - [Webhook] Receives GitHub Actions test results, logs to `test_runs`
- **`sentry-webhook`** - [Webhook] Receives Sentry error alerts, logs to `error_logs`
- **`resend-webhook`** - [Webhook] Receives Resend email events (delivered, bounced, etc.)

### SEO & Social Sharing
- **`generate-sitemap`** - [Public] Generates dynamic XML sitemap (static pages + posts + events + albums + vendors)
- **`social-preview`** - [Public, GET] Returns HTML page with dynamic OG meta tags for social sharing previews. Supports `eventId`, `newsletterId`, and `redirect` query params. Proxied via Cloudflare Redirect Rule at `/share` path on primary domain. Uses JS-only redirect so crawlers read OG tags before browser navigates away. Renamed from `generate-meta-tags` (Feb 2026) due to persistent deployment issues with the old name.

### Utility Functions
- **`get-sentry-dsn`** - [Public] Returns Sentry DSN for client-side error tracking
- **`get-google-places-key`** - [Public] Returns Google Places API key for location autocomplete
- **`generate-workout-image`** - [Auth Required] Generates workout **activity** and **celebration** images from the user's selected fitness avatar and an enabled location; saves to `workout_generated_images` + `workout-images` bucket

### Recipe Pal (AI Cooking Game)
- **`generate-recipe-suggestions`** - [Auth Required] Generates 3-5 recipe ideas from user's ingredient/tool inventory via Lovable AI
- **`generate-full-recipe`** - [Auth Required] Generates complete recipe with steps, tips, safety notes, and AI image
- **`generate-recipe-expansion-tips`** - [Auth Required] AI suggestions for ingredients/tools to expand cooking options
- **`regenerate-recipe-image`** - [Auth Required] Regenerates AI image for existing recipe
- **`generate-recipe-ingredient-icon`** - [Admin Only] Generates realistic ingredient icon via Lovable AI
- **`generate-recipe-tool-icon`** - [Admin Only] Generates kitchen tool icon via Lovable AI
- **`backfill-recipe-tools`** - [Admin Only] Infers tools from recipe steps using regex pattern matching

### Games & Gamification
- **`generate-memory-match-icon`** - [Auth Required] Generates a memory match card icon (AI subject → server composites solid theme background for full-bleed 512×512)
- **`generate-memory-match-card-back`** - [Auth Required] Generates themed card-back art for a pack
- **`generate-memory-match-description`** - [Auth Required] Generates pack description/style/items suggestions

---

## Alphabetical Index

| Function | Auth | Dependencies | Purpose |
|----------|------|--------------|---------|
| aftership-webhook | Webhook | AfterShip | ⚠️ NOT FUNCTIONAL - Receives tracking updates |
| broadcast-product-update | Admin | Supabase | Sends product update notifications |
| cleanup-email-test-data | Test | Supabase | Removes email test data |
| cleanup-test-data-unified | Test | Supabase | Unified test data cleanup (excludes persistent accounts) |
| create-donation-checkout | Public | Stripe | Creates donation checkout session |
| create-marketplace-checkout | Auth | Stripe | Creates marketplace checkout with multi-vendor fees |
| create-persistent-test-accounts | Admin | Supabase | Creates/verifies persistent test accounts |
| create-sponsorship-checkout | Public | Stripe | Creates sponsorship checkout session |
| create-stripe-connect-account | Auth | Stripe | Creates Stripe Connect account for vendors |
| create-user | Admin | Supabase | Creates test user accounts |
| create-vendor-transfer | Internal | Stripe | Transfers funds to vendor on fulfillment |
| check-stripe-connect-status | Auth | Stripe | Checks vendor Stripe Connect status |
| donation-mapping-snapshot | Admin | Stripe, Supabase | Loads all Stripe + DB objects for email + date mapping |
| generate-receipts | Cron | Resend, Stripe | Batch generates monthly receipts |
| generate-year-end-summary | Cron | Supabase | Creates annual giving summaries |
| get-google-places-key | Public | None | Returns Google Places API key |
| get-sentry-dsn | Public | None | Returns Sentry DSN |
| github-test-webhook | Webhook | Supabase | Logs GitHub Actions test results |
| manage-sponsorship | Auth | Stripe | Customer portal access |
| moderate-content | Auth | Lovable AI | AI text moderation |
| moderate-image | Auth | Lovable AI | AI image moderation |
| notify-admin-new-contact | Internal | Resend | **Multi-recipient** admin notifications for contact submissions |
| process-inbound-email | Webhook | Supabase | Processes CloudFlare email routing with **original sender extraction** |
| resend-webhook | Webhook | Supabase | Logs Resend email events |
| reset-daily-cards | Admin | Supabase | Resets daily scratch cards with scope |
| seed-email-test-data | Test | Supabase | Seeds email test data |
| seed-halloween-stickers | Admin | Supabase | Seeds Halloween sticker collection |
| send-approval-notification | Internal | Resend | Sends approval notifications |
| send-automated-campaign | Admin | Resend | Sends automated campaigns |
| send-contact-reply | Auth | Resend | Sends contact form replies |
| send-digest-email | Cron | Resend | Sends batched digest emails |
| send-message-notification | Internal | Resend | Sends message notifications |
| send-newsletter | Admin | Resend | Sends newsletter campaigns with logging |
| send-notification-email | Internal | Resend | Sends individual notifications |
| send-order-shipped | Internal | Resend | Sends customer shipped/tracking email |
| send-sponsorship-receipt | Internal | Resend | Sends tax-deductible receipts |
| send-test-automated-template | Admin | Resend | Sends test automated template emails |
| send-test-newsletter | Admin | Resend | Sends test newsletters to logged-in admin |
| sentry-webhook | Webhook | Supabase | Logs Sentry error alerts |
| stripe-webhook | Webhook | Stripe | Handles all Stripe events |
| submit-tracking | Vendor | AfterShip | Submits order tracking |
| sync-donation-history | Auth/Cron | Stripe, Supabase | Syncs Stripe transactions to donation_stripe_transactions, filters marketplace |
| reconcile-donations-from-stripe | Cron | Stripe, Supabase | Auto-fixes pending donations by checking Stripe status |
| update-sponsorship | Auth | Stripe | Updates sponsorship tier |
| verify-marketplace-payment | Auth | Stripe | Polling-based marketplace payment verification |
| verify-sponsorship-payment | Webhook | Stripe | Verifies payment completion |
| generate-recipe-suggestions | Auth | Lovable AI | Generates 3-5 recipe ideas from ingredients/tools |
| generate-full-recipe | Auth | Lovable AI | Generates complete recipe with steps, tips, safety notes, image |
| generate-recipe-expansion-tips | Auth | Lovable AI | AI suggestions for expanding cooking options |
| regenerate-recipe-image | Auth | Lovable AI | Regenerates AI image for recipe |
| generate-recipe-ingredient-icon | Admin | Lovable AI | Generates realistic ingredient icons |
| generate-recipe-tool-icon | Admin | Lovable AI | Generates kitchen tool icons |
| backfill-recipe-tools | Admin | Supabase | Infers tools from recipe steps via regex |

---

## By Authentication Type

### Public (verify_jwt = false)
**Functions callable without authentication, usually for public forms or utility endpoints**

- `create-donation-checkout` - Public donation form
- `create-sponsorship-checkout` - Public sponsorship form
- `get-sentry-dsn` - Client-side error tracking setup
- `get-google-places-key` - Location autocomplete

### JWT Required (default)
**Requires valid authentication token, uses auth.uid() for user context**

- `manage-sponsorship` - User manages own sponsorships
- `update-sponsorship` - User updates own sponsorships
- `moderate-content` - Authenticated users can moderate
- `moderate-image` - Authenticated users can moderate
- `send-contact-reply` - Admins reply to contact forms
- `record-terms-acceptance` - Users accept terms

### Admin Only
**Requires admin or owner role via `has_admin_access()`**

- `broadcast-product-update` - Sends notifications to all users
- `send-newsletter` - Sends newsletter campaigns with comprehensive logging
- `send-test-newsletter` - Tests newsletter to logged-in admin
- `send-test-automated-template` - Tests automated template to logged-in admin
- `send-automated-campaign` - Sends marketing campaigns
- `seed-halloween-stickers` - Seeds sticker collections
- `reset-daily-cards` - Resets daily scratch cards with scope targeting
- `create-user` - Creates test users

### Vendor Authentication
**Requires vendor status check via `vendors` table**

- `submit-tracking` - Vendors submit order tracking

### Internal Only
**Called only by database triggers, cron jobs, or other edge functions**

- `send-notification-email` - Triggered by notification system
- `send-digest-email` - Triggered by cron job
- `send-approval-notification` - Triggered by approval system
- `send-message-notification` - Triggered by message system
- `send-sponsorship-receipt` - Triggered by payment webhook
- `generate-receipts` - Triggered by cron job
- `generate-year-end-summary` - Triggered by cron job
- `notify-admin-new-contact` - Triggered by contact form

### Webhook Signature Required
**Verifies external service signatures for security**

- `stripe-webhook` - Verifies Stripe signature
- `github-test-webhook` - Verifies GitHub signature
- `sentry-webhook` - Verifies Sentry signature
- `resend-webhook` - Verifies Resend signature, skips non-campaign emails
- `process-inbound-email` - Verifies CloudFlare signature
- `aftership-webhook` - ⚠️ NOT FUNCTIONAL
- `verify-sponsorship-payment` - Verifies Stripe checkout

### Test Only
**Used exclusively in automated testing, should never be called in production**

- `seed-email-test-data` - Creates test users/data
- `cleanup-email-test-data` - Removes test data
- `cleanup-test-data-unified` - Unified test cleanup

---

## Common Patterns

### CORS Headers (Required for All)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### Supabase Client Initialization
```typescript
// Admin client (service role)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

// User-scoped client (JWT auth)
const authHeader = req.headers.get("Authorization")!;
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: authHeader } } }
);
```

### Zod Validation Pattern
```typescript
const requestSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  // ... more fields
});

const validationResult = requestSchema.safeParse(await req.json());
if (!validationResult.success) {
  return new Response(
    JSON.stringify({ 
      error: 'Validation failed',
      details: validationResult.error.errors
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Error Handling Pattern
```typescript
try {
  // Main logic
} catch (error: any) {
  console.error('Error in function-name:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

---

## Secrets Required by Function

### Stripe Functions
- `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_TEST` (dual mode)
- `STRIPE_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET_TEST` (dual mode)

### Email Functions (Resend)
- `RESEND_API_KEY`

### AI Functions (Lovable AI)
- `LOVABLE_API_KEY` (auto-provisioned)

### Tracking Functions
- `AFTERSHIP_API_KEY`

### Webhook Functions
- `CLOUDFLARE_EMAIL_WEBHOOK_SECRET`
- Various webhook secrets per service

### Utility Functions
- `SENTRY_DSN`
- `GOOGLE_PLACES_API_KEY`

---

## Notes

- **Version Consistency**: All functions use `@supabase/supabase-js@2.57.2` for stability
- **Logging**: All functions log errors with context for debugging
- **Rate Limiting**: Notification emails implement rate limiting (1/hour per user/type)
- **Dual Mode Stripe**: Payment functions support test/live mode via `app_settings.stripe_mode`
- **Security**: All webhook functions verify signatures before processing
- **Testing**: Test functions prefixed with `test-` or contain "test" in name
- **Newsletter placeholders**: Newsletter sends (including **test** sends) replace `{{organization_name}}`, `{{month}}`, `{{year}}`, and `{{site_url}}`. Test sends keep links clickable but disable tracking.

---

## Detailed Function Documentation

### create-donation-checkout

**Location:** `supabase/functions/create-donation-checkout/index.ts`

**Auth:** Public (no JWT required)

**Purpose:** Creates Stripe Checkout session for general donations (not tied to specific bestie)

**Request Body:**
```typescript
{
  amount: number,        // Min: 5, Max: 100,000
  frequency: 'monthly' | 'one-time',
  email: string,         // Valid email format
  coverStripeFee: boolean // Optional, defaults to false
}
```

**Validation:** Zod schema with detailed error messages

**Process:**
1. Gets Stripe mode from `app_settings.stripe_mode` ('test' or 'live')
2. Calculates final amount with optional fee coverage: `(amount + 0.30) / 0.971`
3. Creates/retrieves Stripe customer by email
4. Creates Stripe Checkout session:
   - Mode: `'payment'` (one-time) or `'subscription'` (monthly)
   - **Metadata:** `{type: 'donation', frequency, amount, coverStripeFee, donation_type: 'general'}`
   - Success URL: `/support?donation=success`
   - Cancel URL: `/support`
5. **Inserts donation record with status = 'pending'**
   - Sets `stripe_customer_id` immediately
   - Sets `donor_id` if user has profile, otherwise `donor_email`
   - **CRITICAL:** Database constraint must allow 'pending' status

**Response:**
```typescript
{ url: string }  // Redirect to Stripe Checkout
```

**Webhook Integration:**
- `stripe-webhook` receives `checkout.session.completed` event
- Identifies donation by `metadata.type === 'donation'`
- Updates status to 'completed' (one-time) or 'active' (monthly)
- Sets `stripe_subscription_id` for monthly donations

**Common Issues:**
- ❌ Donations not appearing → Check database constraint allows 'pending'
- ❌ Donations stuck at 'pending' → Check webhook fired and constraint allows 'completed'/'active'
- ❌ Wrong Stripe mode → Verify `app_settings.stripe_mode` matches intent

**See Also:** `docs/DONATION_SYSTEM.md`, `docs/DONATION_DEBUGGING_LESSONS.md`

---

**Last Updated:** 2025-10-22 - After comprehensive donation debugging
